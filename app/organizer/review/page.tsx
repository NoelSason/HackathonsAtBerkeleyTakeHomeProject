import type { Metadata } from "next";
import { requireOrganizer } from "@/lib/auth";
import { nextApplication } from "./actions";
import { ReviewQueue } from "@/components/organizer/review-queue";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewQueuePage() {
  await requireOrganizer();

  // Fetched on the server so the first application is in the HTML rather
  // than arriving after a spinner. Every one after it comes from the action.
  const initial = await nextApplication([]);

  return <ReviewQueue initial={initial} />;
}
