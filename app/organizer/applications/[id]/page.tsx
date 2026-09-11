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
import { InsightPanel, type Claim, type StoredInsight } from "@/components/organizer/insight-panel";
import type { RepoOutcome } from "@/lib/insights/generate";
import type { RepoFacts } from "@/lib/insights/github";
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
      .select(
        "summary, specificity, specificity_reason, claims, repo_url, repo_outcome, repo_stats, repo_findings, model, generated_at",
      )
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
   * The anchoring defence lives where the page actually is blind — the queue,
   * which has no CalIntelligence panel at all and is not getting one.
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
              <DecisionControls applicationId={application.id} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * Narrows the stored insight row into the shape the panel renders.
 *
 * Four of these columns are jsonb, so they arrive typed as `Json`. Rather than
 * assert them into place, each is checked for the shape the panel actually
 * reaches into and anything malformed is dropped. A row written by an earlier
 * version of the generator — one with no claims and no recorded outcome —
 * therefore renders as a reading with those sections missing, rather than
 * throwing halfway through a render.
 */
function toStoredInsight(row: {
  summary: string;
  specificity: number;
  specificity_reason: string;
  claims: unknown;
  repo_url: string | null;
  repo_outcome: unknown;
  repo_stats: unknown;
  repo_findings: unknown;
  model: string;
  generated_at: string;
} | null): StoredInsight | null {
  if (!row) return null;

  const findings = row.repo_findings;
  const isFindings =
    typeof findings === "object" &&
    findings !== null &&
    Array.isArray((findings as { corroborates?: unknown }).corroborates) &&
    Array.isArray((findings as { adds?: unknown }).adds) &&
    Array.isArray((findings as { discrepancies?: unknown }).discrepancies);

  // `what_it_is` arrived after the first rows were written, so a stored
  // reading without it degrades to no description rather than to a crash.
  const described =
    isFindings && typeof (findings as { what_it_is?: unknown }).what_it_is === "string"
      ? (findings as { what_it_is: string }).what_it_is
      : "";

  const claims = Array.isArray(row.claims)
    ? row.claims.filter(
        (claim): claim is Claim =>
          typeof claim === "object" &&
          claim !== null &&
          typeof (claim as { field?: unknown }).field === "string" &&
          typeof (claim as { quote?: unknown }).quote === "string",
      )
    : [];

  const outcome =
    typeof row.repo_outcome === "object" &&
    row.repo_outcome !== null &&
    typeof (row.repo_outcome as { state?: unknown }).state === "string"
      ? (row.repo_outcome as RepoOutcome)
      : null;

  return {
    summary: row.summary,
    specificity: row.specificity,
    specificity_reason: row.specificity_reason,
    claims,
    repo_url: row.repo_url,
    repo_outcome: outcome,
    repo_stats: toRepoFacts(row.repo_stats),
    repo_findings: isFindings
      ? {
          what_it_is: described,
          ...(findings as { corroborates: string[]; adds: string[]; discrepancies: string[] }),
        }
      : null,
    model: row.model,
    generated_at: row.generated_at,
  };
}

/**
 * Fills in a stored facts blob that predates the fields the panel now reads.
 *
 * The facts CalIntelligence records grew — commit subjects, a directory
 * breakdown, file types, a dependency manifest — and rows written before that
 * carry none of them. Casting the stored jsonb straight to `RepoFacts` claims
 * a shape the row does not have, and the panel duly crashed on
 * `facts.recentCommits.length` with "Cannot read properties of undefined".
 *
 * **A cast is an assertion, and this is the one place in the app where the
 * data is genuinely older than the type.** Every field the panel touches gets
 * a default here, so an old row renders as a reading with less in it rather
 * than as a stack trace.
 */
function toRepoFacts(value: unknown): RepoFacts | null {
  if (typeof value !== "object" || value === null) return null;

  const stored = value as Partial<RepoFacts>;
  const array = <T,>(input: unknown): T[] => (Array.isArray(input) ? (input as T[]) : []);

  return {
    ...(stored as RepoFacts),
    topics: array(stored.topics),
    homepage: stored.homepage ?? null,
    hasPages: stored.hasPages ?? false,
    watchers: stored.watchers ?? 0,
    sizeKb: stored.sizeKb ?? 0,
    recentCommits: array(stored.recentCommits),
    activeDays: stored.activeDays ?? null,
    firstCommitAt: stored.firstCommitAt ?? null,
    topContributors: array(stored.topContributors),
    totalBytes: stored.totalBytes ?? null,
    topLevelEntries: array(stored.topLevelEntries),
    directories: array(stored.directories),
    extensions: array(stored.extensions),
    largestFiles: array(stored.largestFiles),
    workflowFiles: array(stored.workflowFiles),
    otherCiFiles: array(stored.otherCiFiles),
    testFileCount: stored.testFileCount ?? 0,
    testFileSamples: array(stored.testFileSamples),
    dependencyManifests: array(stored.dependencyManifests),
    manifestPath: stored.manifestPath ?? null,
    manifestExcerpt: stored.manifestExcerpt ?? null,
    languageShare: stored.languageShare ?? {},
  };
}
