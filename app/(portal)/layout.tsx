import { requireProfile } from "@/lib/auth";
import { ApplicantShell } from "@/components/applicant-shell";

/*
 * Wraps the signed-in applicant pages. The route group keeps `/dashboard`
 * and `/apply` out of the URL structure while letting them share one shell
 * and one profile lookup.
 */
export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();
  return <ApplicantShell profile={profile}>{children}</ApplicantShell>;
}
