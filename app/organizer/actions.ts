"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireDirector, requireOrganizer } from "@/lib/auth";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["application_status"];

export type ActionResult = { error: string | null };

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
