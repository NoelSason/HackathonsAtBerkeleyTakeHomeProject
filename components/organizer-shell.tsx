import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { OrganizerNav } from "@/components/organizer-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { initials, type Profile } from "@/lib/auth";

/**
 * The organizer chrome: a navy bar against the applicant side's warm ground.
 *
 * The colour change is load-bearing rather than decorative. Directors move
 * between reading their own application and deciding someone else's, and the
 * bar is what tells them, at a glance, which side of the portal they are
 * currently acting on.
 */
export function OrganizerShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-sunken">
      <header className="bg-berkeley-deep text-white">
        <div className="flex h-14 items-center justify-between gap-6 px-4 sm:px-8">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2.5">
              <span aria-hidden className="h-4 w-4 shrink-0 rounded-[2px] bg-gold" />
              <span className="text-sm font-bold whitespace-nowrap">Cal Hacks · Organizer</span>
            </span>
            <OrganizerNav />
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2.5 text-[13px] text-steel">
              <Avatar tone="dark">{initials(profile)}</Avatar>
              <span className="hidden sm:inline">{profile.full_name || profile.email}</span>
              {profile.staff_role === "director" && (
                <span className="rounded-pill bg-gold px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-berkeley-deep uppercase">
                  Director
                </span>
              )}
            </span>
            <SignOutButton tone="dark" />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
