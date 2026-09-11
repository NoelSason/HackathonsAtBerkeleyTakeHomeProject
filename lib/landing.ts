import type { Database } from "@/lib/database.types";

type StaffRole = Database["public"]["Enums"]["staff_role"] | null;

/**
 * Where somebody lands when they have not asked for anywhere in particular.
 *
 * Three destinations, because the two organizer roles do different jobs and
 * where you land is the cheapest way for a product to say which one is yours.
 *
 * **A reviewer's job is the queue.** It serves them the least-read application
 * they have not seen, takes a score from the keyboard, and moves on. Landing
 * them on the full pile instead asks them to choose what to read first, which
 * is exactly the decision the queue exists to take away — and the pile shows
 * names and scores, which the queue deliberately hides until they have formed
 * their own judgement.
 *
 * A director decides, and deciding means comparing, so they get the sortable
 * list. An applicant gets their own dashboard.
 *
 * It lives here, on its own, because two callers need it — the sign-in action
 * and the proxy that turns a signed-in visitor away from the sign-in page —
 * and a rule written out twice is a rule free to drift.
 */
export function homeFor(staffRole: StaffRole): string {
  if (staffRole === null) return "/dashboard";
  return staffRole === "reviewer" ? "/organizer/review" : "/organizer/applications";
}
