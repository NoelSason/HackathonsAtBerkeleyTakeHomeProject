import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { Avatar } from "@/components/avatar";
import { SignOutButton } from "@/components/sign-out-button";
import { initials, type Profile } from "@/lib/auth";
import type { ReactNode } from "react";

/** The signed-in applicant chrome: warm ground, one row, no navigation. */
export function ApplicantShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="flex h-16 items-center justify-between gap-4 px-6 sm:px-12">
          <Link href="/dashboard">
            <Wordmark qualifier="PORTAL" />
          </Link>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2.5 text-[13px] text-muted">
              <Avatar>{initials(profile)}</Avatar>
              <span className="hidden sm:inline">{profile.full_name || profile.email}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
