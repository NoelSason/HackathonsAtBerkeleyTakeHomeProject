"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireDirector, requireOrganizer } from "@/lib/auth";
import { generateInsight, INSIGHT_MODEL } from "@/lib/insights/generate";
import type { Database, Json } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["application_status"];

export type ActionResult = { error: string | null };

/** Adds how many readings are left today, so the panel can say so up front. */
export type InsightResult = ActionResult & { remaining?: number };

const reviewSchema = z.object({
  applicationId: z.uuid(),
  score: z.number().int().min(1).max(5),
  notes: z.string().max(2000),
});

/**
 * Records this organizer's score for an application.
 *
 * Upsert rather than insert, because a reviewer revisiting an application
 * should revise their opinion instead of adding a second one. The primary
 * key is (application_id, reviewer_id), so the conflict target is the
 * natural key and no extra uniqueness check is needed here.
 */
export async function submitReview(input: {
  applicationId: string;
  score: number;
  notes: string;
}): Promise<ActionResult> {
  const profile = await requireOrganizer();

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: "That score is not valid." };

  const supabase = await createClient();
  const { error } = await supabase.from("reviews").upsert(
    {
      application_id: parsed.data.applicationId,
      // Taken from the session, never from the request. Accepting a
      // reviewer_id from the client would let one organizer write a review
      // under another's name; the RLS policy would also reject it, but the
      // value should never have been client-supplied in the first place.
      reviewer_id: profile.id,
      score: parsed.data.score,
      notes: parsed.data.notes,
    },
    { onConflict: "application_id,reviewer_id" },
  );

  if (error) return { error: "Could not save that review." };

  revalidatePath("/organizer/applications");
  revalidatePath("/organizer/review");
  return { error: null };
}

const decisionSchema = z.object({
  applicationIds: z.array(z.uuid()).min(1).max(200),
  status: z.enum(["accepted", "waitlisted", "rejected", "under_review"]),
});

/**
 * Accepts, waitlists or rejects one or more applications.
 *
 * Routed through the set_application_status function rather than an UPDATE,
 * because organizers hold no update privilege on the status column. The
 * function checks is_director() itself, so requireDirector here is only
 * about giving a sensible response rather than a database error.
 */
export async function decideApplications(input: {
  applicationIds: string[];
  status: Status;
}): Promise<ActionResult> {
  await requireDirector();

  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { error: "That decision is not valid." };

  const supabase = await createClient();

  for (const applicationId of parsed.data.applicationIds) {
    const { error } = await supabase.rpc("set_application_status", {
      p_application_id: applicationId,
      p_status: parsed.data.status,
    });

    // Stop at the first failure rather than pressing on. A bulk decision
    // that half-applied and reported success would be worse than one that
    // stopped and said so.
    if (error) return { error: "Could not apply that decision to every application." };
  }

  revalidatePath("/organizer/applications");
  return { error: null };
}

/**
 * Produces the reading aid for one application and stores it.
 *
 * Gated on the caller having already scored this application, unless they are
 * a director. That is the same principle as revealing an applicant's identity
 * in the queue: a reviewer forms their own judgement first, and only then
 * sees anything that might anchor it. Directors are deciding rather than
 * blind-reading, so the gate does not apply to them.
 *
 * The result is cached in the database rather than regenerated per view, so
 * two reviewers looking at the same application read identical text. A model
 * called twice would produce two slightly different readings, which would put
 * variance back into the one place this portal works to remove it.
 */
export async function requestInsight(applicationId: string): Promise<InsightResult> {
  const profile = await requireOrganizer();

  // Validated here for the same reason submitReview validates its input: the
  // id reaches a uuid function parameter, and a malformed one should be a
  // sentence rather than a Postgres cast error.
  if (!z.uuid().safeParse(applicationId).success) {
    return { error: "That application no longer exists." };
  }

  const supabase = await createClient();

  if (profile.staff_role !== "director") {
    const { data: ownReview } = await supabase
      .from("reviews")
      .select("score")
      .eq("application_id", applicationId)
      .eq("reviewer_id", profile.id)
      .maybeSingle();

    if (!ownReview) {
      return { error: "Submit your own score first, then this becomes available." };
    }
  }

  const { data: application } = await supabase
    .from("applications")
    .select("role, responses, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return { error: "That application no longer exists." };
  if (application.status === "draft") {
    return { error: "This application has not been submitted yet." };
  }

  // Claimed before the model is called, so a request that is going to be
  // refused costs nothing. The function raises rather than returning a flag,
  // and it does the counting itself: putting the limit in the database is
  // what makes it a limit, since save_application_insight is reachable
  // straight off the REST API by any organizer.
  const { data: remaining, error: budgetError } = await supabase.rpc("claim_insight_budget", {
    p_application_id: applicationId,
  });

  if (budgetError) {
    // P0001 is the daily cap, P0002 the regeneration cooldown. Both carry a
    // message written to be read by an organizer; anything else is ours.
    const known = budgetError.code === "P0001" || budgetError.code === "P0002";
    return { error: known ? budgetError.message : "Could not start that reading." };
  }

  const result = await generateInsight(
    application.role,
    (application.responses ?? {}) as Record<string, unknown>,
  );

  if (!result.ok) return { error: result.reason };

  const { error } = await supabase.rpc("save_application_insight", {
    p_application_id: applicationId,
    p_summary: result.insight.summary,
    p_specificity: result.insight.specificity,
    p_specificity_reason: result.insight.specificity_reason,
    p_repo_url: result.repoUrl,
    p_repo_stats: result.repoStats as unknown as Json,
    p_repo_findings: result.insight.repo as unknown as Json,
    p_model: INSIGHT_MODEL,
  });

  if (error) return { error: "Generated it, but could not save it." };

  revalidatePath(`/organizer/applications/${applicationId}`);
  return { error: null, remaining };
}

/**
 * Takes back every review the caller has written.
 *
 * The scope lives in the database function, which reads the reviewer from the
 * session rather than taking one as an argument. That is deliberate: there is
 * no delete policy on reviews, because one organizer removing another's
 * record of what they thought is exactly the silent edit this schema refuses
 * to allow, and a function that accepted a reviewer id would reintroduce it.
 */
export async function resetMyReviews(): Promise<ActionResult & { removed?: number }> {
  await requireOrganizer();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reset_my_reviews");

  if (error) return { error: "Could not clear those reviews." };

  revalidatePath("/organizer/review");
  revalidatePath("/organizer/applications");
  return { error: null, removed: data ?? 0 };
}
