import type { Metadata } from "next";
import { requireOrganizer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { nextApplication } from "./actions";
import { ReviewQueue } from "@/components/organizer/review-queue";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewQueuePage() {
  const profile = await requireOrganizer();
  const supabase = await createClient();

  // Fetched on the server so the first application is in the HTML rather
  // than arriving after a spinner. Every one after it comes from the action.
  const [initial, { count }] = await Promise.all([
    nextApplication([]),
    supabase
      .from("reviews")
      .select("application_id", { count: "exact", head: true })
      .eq("reviewer_id", profile.id),
  ]);

  return <ReviewQueue initial={initial} reviewsWritten={count ?? 0} />;
}
