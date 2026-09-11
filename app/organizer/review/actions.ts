"use server";

import { createClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth";
import { SUMMARY_COLUMNS, toSummaries, type ApplicationSummary } from "@/lib/applications/summary";
import { APPLICATION_FORMS } from "@/lib/applications/forms";
import { INSIGHT_COLUMNS, toStoredInsight, type StoredInsight } from "@/lib/insights/stored";

/** How far down the queue to look before giving up. */
const WINDOW = 50;

export type QueueProgress = { reviewedByMe: number; outstanding: number };

export type QueueItem = {
  application: ApplicationSummary | null;
  /**
   * The stored reading for the served application, if one exists.
   *
   * Fetched here rather than by the queue component so it arrives in the same
   * round trip as the application. A second request would put a gap in the
   * card on every advance, and the queue is the one screen in this product
   * whose whole point is not making a reviewer wait.
   */
  insight: StoredInsight | null;
  progress: QueueProgress;
};

/**
 * The next application this organizer should read.
 *
 * Ordering is least-reviewed first, then oldest submitted. That combination
 * is what stops the queue starving: without the review count an application
 * that arrived late would never be reached, and without the submission time
 * two applications on zero reads would be served in arbitrary order and the
 * earlier applicant would wait longer for no reason.
 *
 * Applications this organizer has already reviewed are excluded in the
 * query rather than filtered afterwards, so a reviewer deep into the pile
 * does not page through their own past reads to find new work.
 */
export async function nextApplication(skipped: string[]): Promise<QueueItem> {
  const profile = await requireOrganizer();
  const supabase = await createClient();

  const { data: myReviews } = await supabase
    .from("reviews")
    .select("application_id")
    .eq("reviewer_id", profile.id);

  const seen = new Set([...(myReviews ?? []).map((row) => row.application_id), ...skipped]);

  let query = supabase
    .from("application_summary")
    .select(SUMMARY_COLUMNS)
    .in("status", ["submitted", "under_review"])
    .order("review_count", { ascending: true })
    .order("submitted_at", { ascending: true })
    .limit(WINDOW);

  if (seen.size > 0) {
    query = query.not("id", "in", `(${[...seen].join(",")})`);
  }

  const { data } = await query;
  const candidates = toSummaries(data);

  // The target read count differs per role and lives in the form config, so
  // it is applied here rather than in SQL. Duplicating those numbers into a
  // database function would give them two places to disagree.
  const needsReading = candidates.filter(
    (row) => row.reviewCount < APPLICATION_FORMS[row.role].reviewsRequired,
  );

  const application = needsReading[0] ?? null;

  const { data: insightRow } = application
    ? await supabase
        .from("application_insights")
        .select(INSIGHT_COLUMNS)
        .eq("application_id", application.id)
        .maybeSingle()
    : { data: null };

  return {
    application,
    insight: toStoredInsight(insightRow),
    progress: { reviewedByMe: myReviews?.length ?? 0, outstanding: needsReading.length },
  };
}
