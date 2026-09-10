import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLE_COPY } from "@/lib/applications/roles";
import { APPLICATION_FORMS, isSectionComplete } from "@/lib/applications/forms";
import { EVENT } from "@/lib/event";
import { StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { StatusTimeline } from "@/components/applications/status-timeline";
import { LiveRefresh } from "@/components/applications/live-refresh";
import { DiscardDraft } from "@/components/applications/discard-draft";
import { inEventZone } from "@/lib/event";

export const metadata: Metadata = { title: "My applications" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const profile = await requireProfile();
  const { submitted } = await searchParams;

  const supabase = await createClient();
  // Scoped to this person explicitly.
  //
  // It is tempting to leave this off, because the select policy on
  // applications already stops an applicant reading anybody else's row. But
  // policies OR together, and there are two: "applicants read their own" and
  // "organizers read every application". An organizer matches the second, so
  // an unfiltered query here does not mean "mine" for them, it means "all
  // sixty-one" — and this is a page titled My applications.
  //
  // Row-level security decides what a query is allowed to return. It is not
  // a substitute for saying what the query is actually asking for.
  const { data: applications } = await supabase
    .from("applications")
    .select("id, role, status, responses, display_id, created_at, submitted_at, updated_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true });

  const rows = applications ?? [];

  return (
    <div className="mx-auto max-w-240 px-6 py-14">
      <LiveRefresh userId={profile.id} />

      {submitted && (
        <p
          role="status"
          className="mb-8 rounded-control border border-positive/25 bg-positive-soft px-4 py-3 text-sm font-medium text-positive"
        >
          Application submitted. You will hear from us by {EVENT.decisionsLabel}.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My applications</h1>
          <p className="mt-1.5 text-muted">
            Decisions release {EVENT.decisionsLabel} by email and here.
          </p>
        </div>

        <Link href="/apply" className={buttonStyles("secondary", "md")}>
          + New application
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-9 rounded-control border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="font-semibold">You have not started an application yet.</p>
          <p className="mt-1 text-sm text-muted">
            Applications close {EVENT.applicationsCloseLabel}.
          </p>
          <Link href="/apply" className={buttonStyles("primary", "md", "mt-6")}>
            Start an application
          </Link>
        </div>
      ) : (
        <ul className="mt-9 space-y-4">
          {rows.map((application) => {
            const sections = APPLICATION_FORMS[application.role].sections;
            const responses = (application.responses ?? {}) as Record<string, unknown>;
            const done = sections.filter((section) => isSectionComplete(section, responses)).length;

            return (
              <li key={application.id} className="rounded-control border border-line bg-surface">
                <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <span className="text-lg font-bold">{ROLE_COPY[application.role].label}</span>
                    <span className="font-mono text-[12px] text-faint">
                      APP-{application.display_id}
                    </span>
                    <StatusBadge status={application.status} />
                  </div>

                  {application.status === "draft" ? (
                    <div className="flex flex-wrap items-center gap-5">
                      <span className="text-[13px] text-muted">
                        {done} of {sections.length} sections ·{" "}
                        {inEventZone(application.updated_at, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <DiscardDraft applicationId={application.id} />
                      <Link
                        href={`/apply/${application.role}`}
                        className={buttonStyles("primary", "sm")}
                      >
                        Resume editing
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/apply/${application.role}`}
                      className="text-sm font-semibold text-berkeley hover:underline"
                    >
                      View submission
                    </Link>
                  )}
                </div>

                {application.status !== "draft" && (
                  <div className="border-t border-line px-7 pt-7 pb-8">
                    <StatusTimeline
                      status={application.status}
                      createdAt={application.created_at}
                      submittedAt={application.submitted_at}
                      decisionLabel={EVENT.decisionsLabel}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap items-baseline gap-3 border-t border-line pt-7">
        <span className="font-mono text-[11px] tracking-[0.08em] text-faint">NEXT</span>
        <span className="text-sm text-muted">
          Applications close {EVENT.applicationsCloseLabel}. Drafts are saved as you type.
        </span>
      </div>
    </div>
  );
}
