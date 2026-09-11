/**
 * Fills the database with a realistic set of applications.
 *
 * Run with:  npm run seed
 *
 * This talks to Supabase with the service role key, so it bypasses every
 * row-level security policy. That is exactly why it lives in a script run
 * from a developer's machine and never in the deployed app.
 *
 * It wipes every existing user first, which is safe only because this
 * project holds nothing but invented data. It is not something to point at
 * a database with real applicants in it.
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_PASSWORD } from "../lib/demo-accounts.ts";
import { PEOPLE, APPLICATIONS } from "./seed-data.ts";
import type { Database } from "../lib/database.types.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DAY_MS = 86_400_000;

/** Small deterministic hash, so the same seed run twice looks identical. */
function hash(value: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) % 1_000_003;
  }
  return total;
}

async function wipe() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  // Applications, reviews and profiles all cascade from auth.users, so
  // deleting the users is enough to empty the whole schema.
  for (const user of data.users) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
  }

  // Rewind the application numbering too. Deleting the rows does not rewind
  // the identity sequence behind display_id, so without this each reseed
  // started where the last one stopped and every number quoted in a demo
  // script or a screenshot went stale. Safe only because the table is empty
  // at this point, which the function checks for itself.
  const { error: resetError } = await supabase.rpc("reset_application_display_ids");
  if (resetError) throw resetError;

  console.log(`  wiped ${data.users.length} existing users`);
}

async function createPeople(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const person of PEOPLE) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: person.email,
      password: DEMO_PASSWORD,
      // Skips the confirmation email entirely. Supabase's built-in SMTP is
      // rate limited to a handful of sends an hour, which would make seeding
      // forty-six accounts impossible.
      email_confirm: true,
      user_metadata: { full_name: person.fullName, school: person.school ?? "" },
    });

    if (error || !data.user) throw error ?? new Error(`Could not create ${person.email}`);
    ids.set(person.email, data.user.id);

    // The handle_new_user trigger has already created the profile from the
    // metadata above. Only staff_role is left, because the trigger
    // deliberately refuses to read it from client-supplied metadata.
    if (person.staffRole) {
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ staff_role: person.staffRole })
        .eq("id", data.user.id);
      if (roleError) throw roleError;
    }
  }

  console.log(`  created ${ids.size} accounts`);
  return ids;
}

async function createApplications(ids: Map<string, string>) {
  let applicationCount = 0;
  let reviewCount = 0;

  for (const seed of APPLICATIONS) {
    const userId = ids.get(seed.applicant);
    if (!userId) throw new Error(`Unknown applicant ${seed.applicant}`);

    // Offset by whole days alone and every application in the pile carries the
    // same clock time, which is the one detail that gives seeded data away at
    // a glance. The hour is derived from the applicant's email rather than
    // randomised, so re-running the seed produces the same times.
    const hourOffset = ((hash(seed.applicant + seed.role) % 1020) - 510) * 60_000;

    const submittedAt =
      seed.status === "draft" || seed.submittedDaysAgo === undefined
        ? null
        : new Date(Date.now() - seed.submittedDaysAgo * DAY_MS + hourOffset);

    // Started a couple of days before it was sent, which is what makes the
    // applicant timeline show two distinct dates rather than one.
    const createdAt = submittedAt ? new Date(submittedAt.getTime() - 2 * DAY_MS) : new Date();

    const { data: application, error } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        role: seed.role,
        status: seed.status,
        responses: seed.responses,
        submitted_at: submittedAt?.toISOString() ?? null,
        created_at: createdAt.toISOString(),
      })
      .select("id")
      .single();

    if (error || !application) throw error ?? new Error("Insert returned no row");
    applicationCount += 1;

    for (const [reviewerEmail, review] of Object.entries(seed.reviews ?? {})) {
      const reviewerId = ids.get(reviewerEmail);
      if (!reviewerId) throw new Error(`Unknown reviewer ${reviewerEmail}`);

      const { error: reviewError } = await supabase.from("reviews").insert({
        application_id: application.id,
        reviewer_id: reviewerId,
        score: review.score,
        notes: review.notes,
      });

      if (reviewError) throw reviewError;
      reviewCount += 1;
    }
  }

  console.log(`  created ${applicationCount} applications and ${reviewCount} reviews`);
}

async function main() {
  console.log("Seeding Cal Hacks portal…");
  await wipe();
  const ids = await createPeople();
  await createApplications(ids);
  console.log("Done. Sign in with any demo account on the sign-in page.");
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
