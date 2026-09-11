import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth";
import { toSummary, SUMMARY_COLUMNS } from "@/lib/applications/summary";
import { APPLICATION_FORMS } from "@/lib/applications/forms";
import { ROLE_COPY } from "@/lib/applications/roles";
import { StatusBadge } from "@/components/ui/badge";
import { ApplicationAnswers } from "@/components/organizer/application-answers";
import { GradeForm } from "@/components/organizer/grade-form";
import { DecisionControls } from "@/components/organizer/decision-controls";
import { InsightPanel } from "@/components/organizer/insight-panel";
import { INSIGHT_COLUMNS, toStoredInsight } from "@/lib/insights/stored";
import { inEventZone } from "@/lib/event";

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationDetailPage({
  params,
}: PageProps<"/organizer/applications/[id]">) {
  const { id } = await params;
  const profile = await requireOrganizer();
  const supabase = await createClient();

  const [{ data: raw }, { data: reviewRows }, { data: insightRow }] = await Promise.all([
    supabase.from("application_summary").select(SUMMARY_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("reviews")
      .select("score, notes, created_at, reviewer_id, reviewer:profiles!reviews_reviewer_id_fkey(full_name)")
      .eq("application_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("application_insights")
      .select(INSIGHT_COLUMNS)
      .eq("application_id", id)
      .maybeSingle(),
  ]);

  const application = raw ? toSummary(raw) : null;
  if (!application) notFound();

  const reviews = reviewRows ?? [];
  const mine = reviews.find((review) => review.reviewer_id === profile.id);
  const required = APPLICATION_FORMS[application.role].reviewsRequired;

  /*
   * Open to any organizer, and it did not start that way.
   *
   * The first version required a reviewer to record their own score before
   * CalIntelligence would run, by analogy with the blind queue. The analogy
   * does not hold: **this page is not blind.** It already shows the
   * applicant's name, their school, their email and every score another
   * organizer has left. Withholding a summary of answers printed directly
   * above it protected nothing the page had not already given away, and it
   * cost a reviewer a click and an explanation on every application.
   *
   * The queue shows a reading too, but withholds the repository half until
   * Reveal, because a repository address gives away who the applicant is.
   */
  const canGenerate = true;
  const insight = toStoredInsight(insightRow);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-4 py-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/organizer/applications"
            className="text-[13px] font-semibold text-berkeley hover:underline"
          >
            ← Back to list
          </Link>
          <span aria-hidden className="h-5 w-px bg-line" />
          <h1 className="text-xl font-extrabold tracking-tight">{application.fullName}</h1>
          <span className="font-mono text-[12px] text-faint">
            APP-{application.displayId} · {ROLE_COPY[application.role].label.toUpperCase()}
          </span>
          <StatusBadge status={application.status} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* min-w-0 is load-bearing. A flex item defaults to min-width:auto, so
            it refuses to shrink below its widest child — and CalIntelligence
            renders raw repository JSON in a <pre>, which does not wrap. Without
            this the column grew to the width of the longest line and gave the
            whole page a horizontal scrollbar tens of thousands of pixels wide,
            pushing the reviews out of view. */}
        <div className="min-w-0 flex-1 border-line px-4 py-9 sm:px-8 lg:border-r">
          <p className="font-mono text-[11px] tracking-[0.08em] text-faint">BASICS</p>

          <dl className="mt-3.5 grid gap-5 border-b border-line pb-7 sm:grid-cols-3">
            <div>
              <dt className="text-[12px] text-faint">Email</dt>
              <dd className="mt-0.5 text-sm font-medium">{application.email}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-faint">School</dt>
              <dd className="mt-0.5 text-sm font-medium">{application.school ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-faint">Submitted</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {application.submittedAt
                  ? inEventZone(application.submittedAt, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Not yet submitted"}
              </dd>
            </div>
          </dl>

          <div className="mt-1">
            <ApplicationAnswers role={application.role} responses={application.responses} />
          </div>

          <InsightPanel
            applicationId={application.id}
            insight={insight}
            canGenerate={canGenerate}
          />
        </div>

        <aside className="bg-ground px-4 py-8 sm:px-8 lg:w-105">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] tracking-[0.08em] text-faint">
              REVIEWS · {reviews.length} OF {required}
            </p>
            <p className="font-mono text-[22px] font-semibold">
              {application.meanScore === null ? (
                <span className="text-faint">—</span>
              ) : (
                application.meanScore.toFixed(1)
              )}
              <span className="text-[13px] text-faint"> / 5</span>
            </p>
          </div>

          {application.meanZScore !== null && (
            <p className="mt-1 text-right font-mono text-[12px] text-muted">
              calibrated {application.meanZScore > 0 ? "+" : ""}
              {application.meanZScore.toFixed(2)}
            </p>
          )}

          <ul className="mt-4 space-y-2.5">
            {reviews.map((review) => (
              <li
                key={review.reviewer_id}
                className="rounded-control border border-line bg-surface px-4 py-3.5"
              >
                <div className="flex justify-between gap-3">
                  <span className="text-[13px] font-semibold">
                    {review.reviewer?.full_name ?? "Organizer"}
                  </span>
                  <span className="font-mono text-[13px] font-semibold">{review.score}</span>
                </div>
                {review.notes && (
                  <p className="mt-1.5 text-[13px] leading-snug text-muted">{review.notes}</p>
                )}
                <p className="mt-2 font-mono text-[11px] text-faint">
                  {inEventZone(review.created_at, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </p>
              </li>
            ))}

            {reviews.length === 0 && (
              <li className="rounded-control border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">
                Nobody has read this one yet.
              </li>
            )}
          </ul>

          <div className="mt-6 border-t border-line pt-5">
            <GradeForm
              applicationId={application.id}
              existingScore={mine?.score ?? null}
              existingNotes={mine?.notes ?? ""}
            />
          </div>

          {profile.staff_role === "director" && (
            <div className="mt-6 border-t border-line pt-5">
              <DecisionControls applicationId={application.id} status={application.status} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
