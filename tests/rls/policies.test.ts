import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_PASSWORD } from "@/lib/demo-accounts";
import type { Database } from "@/lib/database.types";
import { hasLiveProject } from "../setup";

/**
 * What the row-level security policies actually do, asserted against the real
 * project with real sessions.
 *
 * These run against Supabase rather than a mock on purpose. A mock would be
 * asserting my understanding of the policies, which is the thing most likely
 * to be wrong; the policies are enforced by Postgres, so Postgres is the only
 * thing that can confirm them. It also catches the failure mode a mock never
 * would: a policy that is correct in the migration file but was never applied.
 *
 * The cost is that the suite needs credentials and a network. It skips itself
 * without them, so `npm test` still passes on a fresh clone.
 */

type Client = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function signIn(email: string): Promise<Client> {
  const client = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);

  return client;
}

describe.skipIf(!hasLiveProject)("row-level security", () => {
  let applicant: Client;
  let reviewer: Client;
  let director: Client;
  let applicantId: string;

  beforeAll(async () => {
    [applicant, reviewer, director] = await Promise.all([
      signIn("hacker@calhacks.demo"),
      signIn("reviewer@calhacks.demo"),
      signIn("director@calhacks.demo"),
    ]);

    const { data } = await applicant.auth.getUser();
    applicantId = data.user!.id;
  });

  describe("an applicant sees their own row and nothing else", () => {
    it("reads only their own applications", async () => {
      const { data, error } = await applicant.from("applications").select("id, user_id");

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
      expect(data!.every((row) => row.user_id === applicantId)).toBe(true);

      // The organizer view of the same table is very much larger.
      const { data: all } = await reviewer.from("applications").select("id");
      expect(all!.length).toBeGreaterThan(data!.length);
    });

    // There is no applicant-facing SELECT policy on reviews at all, so this
    // is an empty result rather than an error. Nothing to leak and nothing
    // to probe.
    it("reads no reviews whatsoever", async () => {
      const { data, error } = await applicant.from("reviews").select("score");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("reads no reading aids", async () => {
      const { data, error } = await applicant.from("application_insights").select("summary");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("reads exactly one profile, their own", async () => {
      const { data, error } = await applicant.from("profiles").select("id");

      expect(error).toBeNull();
      expect(data).toEqual([{ id: applicantId }]);
    });

    it("reads no reading-aid usage rows", async () => {
      const { data, error } = await applicant.from("insight_usage").select("count");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("an applicant cannot escalate", () => {
    // The row policy is satisfied here: it genuinely is their row. What stops
    // this is the column grant, and Postgres refuses with 42501.
    it("cannot make themselves a director", async () => {
      const { error } = await applicant
        .from("profiles")
        .update({ staff_role: "director" })
        .eq("id", applicantId);

      expect(error?.code).toBe("42501");

      const { data } = await applicant.from("profiles").select("staff_role").single();
      expect(data!.staff_role).toBeNull();
    });

    /*
     * USING tests the row as it is; WITH CHECK tests the row as it would
     * become. The two halves fail differently, and both are worth pinning
     * because between them they are what stops an applicant deciding their
     * own outcome.
     */
    it("cannot accept an application that is already submitted", async () => {
      // USING excludes any row that is not a draft, so this matches nothing
      // at all. No error, because there was no row to refuse.
      const { data, error } = await applicant
        .from("applications")
        .update({ status: "accepted" })
        .eq("user_id", applicantId)
        .neq("status", "draft")
        .select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    /*
     * The permitted transition, draft to submitted, is deliberately not
     * exercised here. It is one-way: the update policy's USING clause only
     * matches drafts, and set_application_status refuses 'draft' outright, so
     * nothing short of the service role can put the row back. A suite that
     * held service-role credentials would be able to bypass every policy it
     * claims to be testing, so it holds none, and pays for that by leaving
     * this one transition to the browser.
     */
    it("cannot accept their own draft either", async () => {
      // Here USING passes, because a draft is a row they may edit. WITH CHECK
      // is what refuses the value they tried to write.
      const { error } = await applicant
        .from("applications")
        .update({ status: "accepted" })
        .eq("user_id", applicantId)
        .eq("status", "draft")
        .select("id");

      expect(error?.code).toBe("42501");
    });
  });

  describe("an organizer reads the whole pile", () => {
    it("sees every application", async () => {
      const { data, error } = await reviewer.from("applications").select("id");

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(10);
    });

    it("sees every profile", async () => {
      const { data, error } = await reviewer.from("profiles").select("id");

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(10);
    });

    it("sees every review", async () => {
      const { data, error } = await reviewer.from("reviews").select("score");

      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(10);
    });

    it("cannot write the usage counter directly", async () => {
      const { error } = await reviewer.from("insight_usage").update({ count: 0 }).gte("count", 0);
      expect(error?.code).toBe("42501");
    });
  });

  /*
   * The only director-only rule in the database is inside
   * set_application_status. No policy mentions the distinction, so a reviewer
   * who forged the request still gets refused by the function itself.
   */
  describe("only a director decides", () => {
    let target: { id: string; status: Database["public"]["Enums"]["application_status"] };

    beforeAll(async () => {
      // Something already decided, so putting it back afterwards leaves the
      // demo data exactly as it was.
      const { data } = await director
        .from("applications")
        .select("id, status")
        .eq("status", "waitlisted")
        .limit(1)
        .single();

      target = data!;
    });

    afterAll(async () => {
      // The director test moves this row. Put it back rather than reseeding:
      // a reseed rebuilds forty-six auth users and churns the demo data.
      if (target) {
        await director.rpc("set_application_status", {
          p_application_id: target.id,
          p_status: target.status,
        });
      }
    });

    it("refuses a reviewer", async () => {
      const { error } = await reviewer.rpc("set_application_status", {
        p_application_id: target.id,
        p_status: "accepted",
      });

      expect(error?.message).toContain("only directors");
    });

    it("allows a director", async () => {
      const { error } = await director.rpc("set_application_status", {
        p_application_id: target.id,
        p_status: "accepted",
      });

      expect(error).toBeNull();

      const { data } = await director
        .from("applications")
        .select("status")
        .eq("id", target.id)
        .single();

      expect(data!.status).toBe("accepted");
    });

    // Draft is the one status the function refuses outright, so an accepted
    // application cannot be quietly returned to the applicant for editing.
    it("refuses to send anything back to draft", async () => {
      const { error } = await director.rpc("set_application_status", {
        p_application_id: target.id,
        p_status: "draft",
      });

      expect(error?.message).toContain("cannot be returned to draft");
    });
  });

  describe("an anonymous caller sees nothing", () => {
    it("reads no applications", async () => {
      const anon = createClient<Database>(url, anonKey);
      const { data, error } = await anon.from("applications").select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("reads no profiles", async () => {
      const anon = createClient<Database>(url, anonKey);
      const { data, error } = await anon.from("profiles").select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });
});
