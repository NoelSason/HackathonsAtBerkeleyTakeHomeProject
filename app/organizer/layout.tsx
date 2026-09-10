import { requireOrganizer } from "@/lib/auth";
import { OrganizerShell } from "@/components/organizer-shell";

/*
 * Gate and chrome for everything under /organizer.
 *
 * requireOrganizer is a redirect for the sake of the person, not a security
 * boundary: row-level security already means a plain applicant reading these
 * pages would see an empty table rather than anybody's data. This just sends
 * them somewhere useful instead.
 */
export default async function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  const profile = await requireOrganizer();
  return <OrganizerShell profile={profile}>{children}</OrganizerShell>;
}
