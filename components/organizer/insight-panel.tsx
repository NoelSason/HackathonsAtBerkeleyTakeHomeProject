"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { inEventZone } from "@/lib/event";
import type { RepoFacts } from "@/lib/insights/github";
import type { Comparison, RepoOutcome } from "@/lib/insights/generate";

export type Claim = { field: string; quote: string };

export type StoredInsight = {
  summary: string;
  specificity: number;
  specificity_reason: string;
  claims: Claim[];
  repo_url: string | null;
  repo_outcome: RepoOutcome | null;
  repo_stats: RepoFacts | null;
  repo_findings: Comparison | null;
  model: string;
  generated_at: string;
};

const SPECIFICITY_LABELS = [
  "",
  "No checkable detail",
  "Largely generic",
  "Some specifics",
  "Mostly concrete",
  "Highly concrete",
];

/** What arrives down the stream while a reading is in flight. */
type Live = {
  running: boolean;
  stage: string | null;
  summary: string;
  specificity: number | null;
  specificityReason: string;
  claims: Claim[];
  dropped: number;
  outcome: RepoOutcome | null;
  facts: RepoFacts | null;
  comparison: Comparison | null;
  finishedAt: string | null;
  model: string | null;
};

const EMPTY: Live = {
  running: true,
  stage: "Starting",
  summary: "",
  specificity: null,
  specificityReason: "",
  claims: [],
  dropped: 0,
  outcome: null,
  facts: null,
  comparison: null,
  finishedAt: null,
  model: null,
};

/**
 * CalIntelligence — a reading aid for the committee, not a second opinion.
 *
 * Everything on this panel is descriptive: what the applicant said, which of
 * their sentences can be checked, how much evidence the writing carries, and
 * how a linked repository lines up with the claims. There is deliberately no
 * score, no ranking and no recommendation anywhere in it — a number here would
 * anchor the reviewer, which is the exact failure the blind queue and the
 * calibration view exist to prevent.
 *
 * Two things make it auditable rather than oracular. Every quotation shown
 * under "What can be checked" was verified to appear in the answer above
 * before it was stored, so a reviewer can find it. And the raw repository
 * facts are on the same page under "What it read", so the model's sentences
 * can be held against the fields they were drawn from.
 */
export function InsightPanel({
  applicationId,
  insight,
  canGenerate,
}: {
  applicationId: string;
  insight: StoredInsight | null;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only ever set by a generation that actually happened, so the number
  // appears next to the click that spent one. The cap itself is not repeated
  // here: it lives in claim_insight_budget, and a copy in TypeScript would be
  // a second source of truth free to drift from the one being enforced.
  const [remaining, setRemaining] = useState<number | null>(null);

  /**
   * Reads the response a line at a time instead of waiting for all of it.
   *
   * The endpoint writes one JSON object per line as each part of the work
   * lands, so the summary appears while the repository comparison is still
   * running. A chunk can split a line anywhere, which is what the buffer is
   * for: the last fragment is held back until its newline arrives.
   */
  async function generate() {
    setError(null);
    setLive(EMPTY);

    let response: Response;
    try {
      response = await fetch(`/organizer/applications/${applicationId}/insight`, {
        method: "POST",
      });
    } catch {
      setLive(null);
      setError("Could not reach the server. Check your connection and try again.");
      return;
    }

    if (!response.ok || !response.body) {
      setLive(null);
      setError("Could not start that reading.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let failed = false;

    const apply = (event: StreamEvent) => {
      switch (event.type) {
        case "stage":
          setLive((current) => current && { ...current, stage: event.label });
          break;
        case "outcome":
          setLive((current) => current && { ...current, outcome: event.outcome });
          break;
        case "facts":
          setLive((current) => current && { ...current, facts: event.facts });
          break;
        case "summary":
          setLive((current) => current && { ...current, summary: event.text });
          break;
        case "reading":
          setLive(
            (current) =>
              current && {
                ...current,
                summary: event.reading.summary,
                specificity: event.reading.specificity,
                specificityReason: event.reading.specificity_reason,
                claims: event.reading.claims,
                dropped: event.dropped,
                stage: "Comparing the repository",
              },
          );
          break;
        case "comparison":
          setLive((current) => current && { ...current, comparison: event.comparison });
          break;
        case "done":
          setRemaining(event.remaining);
          setLive(
            (current) =>
              current && {
                ...current,
                running: false,
                stage: null,
                finishedAt: event.generatedAt,
                model: event.model,
              },
          );
          break;
        case "error":
          failed = true;
          setLive(null);
          setError(event.message);
          break;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          apply(JSON.parse(line) as StreamEvent);
        } catch {
          // A malformed line is not worth abandoning the rest of the stream.
        }
      }
    }

    // The stream ended without a done and without an error, which means the
    // connection dropped mid-reading rather than the work finishing.
    setLive((current) => {
      if (failed || !current || !current.running) return current;
      setError("That reading stopped partway through. Try again in a few minutes.");
      return null;
    });

    if (!failed) router.refresh();
  }

  const view = live ? fromLive(live) : fromStored(insight);
  const busy = live?.running ?? false;

  return (
    <section className="mt-9 rounded-control border border-line bg-sunken px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.08em] text-faint">CALINTELLIGENCE</h2>
        {view?.model && view.generatedAt && (
          <p className="font-mono text-[11px] text-faint">
            {view.model} ·{" "}
            {inEventZone(view.generatedAt, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {!view && (
        <div className="mt-3">
          <p className="max-w-160 text-sm text-muted">
            Reads the written answers, pulls out the sentences a reviewer could go and check,
            rates how much checkable detail the writing carries, and holds any linked repository
            up against what was claimed. It never scores an applicant or suggests a decision.
          </p>

          {canGenerate && (
            <Button type="button" onClick={generate} disabled={busy} className="mt-4" size="sm">
              {busy ? "Reading…" : "Read this application"}
            </Button>
          )}
        </div>
      )}

      {busy && live && (
        <p className="mt-3 flex items-center gap-2.5 text-[13px] text-muted" aria-live="polite">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-berkeley"
          />
          {live.stage ?? "Reading"}…
        </p>
      )}

      {view && (
        <div className="mt-4 space-y-6">
          {view.summary && (
            <p className="max-w-160 text-[15px] leading-relaxed">
              {view.summary}
              {busy && <span aria-hidden className="ml-0.5 animate-pulse">▋</span>}
            </p>
          )}

          {view.specificity !== null && (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[11px] tracking-[0.08em] text-faint">
                  EVIDENCE DENSITY
                </span>
                <span className="flex gap-1" aria-hidden>
                  {[1, 2, 3, 4, 5].map((step) => (
                    <span
                      key={step}
                      className={cn(
                        "h-1.5 w-7 rounded-full",
                        step <= (view.specificity ?? 0) ? "bg-berkeley" : "bg-line",
                      )}
                    />
                  ))}
                </span>
                <span className="text-[13px] font-semibold">
                  {SPECIFICITY_LABELS[view.specificity] ?? ""}
                </span>
              </div>

              <p className="mt-2 max-w-160 text-[13px] leading-snug text-muted">
                {view.specificityReason}
              </p>
              <p className="mt-1.5 max-w-160 text-[12px] text-faint">
                This measures how much of the writing can be checked, not how good the applicant
                is. A plain account of one small real thing rates high.
              </p>
            </div>
          )}

          {view.claims.length > 0 && (
            <div>
              <span className="font-mono text-[11px] tracking-[0.08em] text-faint">
                WHAT CAN BE CHECKED
              </span>
              <ul className="mt-2.5 space-y-2">
                {view.claims.map((claim) => (
                  <li key={`${claim.field}-${claim.quote}`} className="max-w-160">
                    <p className="border-l-2 border-line-strong pl-3 text-[13px] leading-snug">
                      “{claim.quote}”
                    </p>
                    <p className="mt-0.5 pl-3 text-[11px] text-faint">{claim.field}</p>
                  </li>
                ))}
              </ul>
              {view.dropped > 0 && (
                <p className="mt-2.5 text-[12px] text-faint">
                  {view.dropped === 1 ? "One quotation was" : `${view.dropped} quotations were`}{" "}
                  left out because {view.dropped === 1 ? "it did" : "they did"} not appear
                  word for word in the answers.
                </p>
              )}
            </div>
          )}

          <RepositorySection
            outcome={view.outcome}
            facts={view.facts}
            findings={view.comparison}
            url={view.repoUrl}
            busy={busy}
          />

          {canGenerate && !busy && (
            <div className="flex flex-wrap items-baseline gap-3">
              <button
                type="button"
                onClick={generate}
                className="cursor-pointer text-[13px] font-medium text-muted transition-colors hover:text-ink"
              >
                Read it again
              </button>
              {remaining !== null && (
                <p className="font-mono text-[11px] text-faint">
                  {remaining} {remaining === 1 ? "reading" : "readings"} left today
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 max-w-160 text-[13px] font-medium leading-snug text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * The repository half, including every way it can come to nothing.
 *
 * A link that could not be read used to render as an absence: no heading, no
 * sentence, nothing to distinguish "they linked a Devpost page" from "the
 * repository is private" from "GitHub would not talk to us". All three now say
 * which one happened, because a reviewer reading an application deserves to
 * know whether silence is about the applicant or about us.
 */
function RepositorySection({
  outcome,
  facts,
  findings,
  url,
  busy,
}: {
  outcome: RepoOutcome | null;
  facts: RepoFacts | null;
  findings: Comparison | null;
  url: string | null;
  busy: boolean;
}) {
  if (!outcome) return null;

  const note = outcomeNote(outcome);
  if (note) {
    return (
      <div>
        <span className="font-mono text-[11px] tracking-[0.08em] text-faint">
          LINKED REPOSITORY
        </span>
        <p className="mt-2 max-w-160 text-[13px] leading-snug text-muted">
          {note}
          {"url" in outcome && outcome.url && (
            <>
              {" "}
              <a
                href={outcome.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-berkeley hover:underline"
              >
                {outcome.url.replace(/^https:\/\//, "")}
              </a>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-[11px] tracking-[0.08em] text-faint">
          LINKED REPOSITORY
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-[12px] text-berkeley hover:underline"
          >
            {url.replace("https://github.com/", "")}
          </a>
        )}
      </div>

      {facts && <RepoHighlights facts={facts} />}

      {findings?.what_it_is && (
        <p className="mt-3.5 max-w-160 text-[13px] leading-relaxed">{findings.what_it_is}</p>
      )}

      {findings ? (
        <div className="mt-4 space-y-3">
          <FindingList label="Backs up the essay" tone="positive" items={findings.corroborates} />
          <FindingList
            label="Not mentioned in the essay"
            tone="neutral"
            items={findings.adds}
          />
          <FindingList label="Does not line up" tone="warning" items={findings.discrepancies} />
        </div>
      ) : (
        busy && <p className="mt-3 text-[13px] text-faint">Comparing it with the answers…</p>
      )}

      {facts && (
        <details className="mt-4">
          <summary className="cursor-pointer font-mono text-[11px] tracking-[0.08em] text-faint hover:text-muted">
            WHAT IT READ
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-control border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted">
            {JSON.stringify(facts, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

/** One sentence for every outcome that produced no repository to show. */
function outcomeNote(outcome: RepoOutcome): string | null {
  switch (outcome.state) {
    case "ok":
      return null;
    case "not_asked":
      return "This application does not ask for a link, so there was nothing to compare the answers against.";
    case "none":
      return "Nothing was linked on this application.";
    case "unparseable":
      return "The link field does not hold a web address, so there was nothing to open.";
    case "profile":
      return "This links a GitHub account rather than one of its repositories, so there was no project to compare the answers against.";
    case "elsewhere":
      return `This links to ${outcome.host}, which is not a GitHub repository. Only public GitHub repositories are read, so the answers were not compared against anything.`;
    case "not_found":
      return "There is no public repository at that address. It may be private, renamed, or since removed.";
    case "rate_limited":
      return "GitHub would not serve us that repository in time, so nothing was read from it. That is our limit, not anything about the applicant.";
    case "unavailable":
      return "GitHub did not answer for that repository, so nothing was read from it.";
  }
}

/**
 * The facts a reviewer wants first, computed here rather than written by the
 * model. Nothing in this strip passed through a prompt, so there is nothing in
 * it to get wrong: it is the stored response rendered.
 */
function RepoHighlights({ facts }: { facts: RepoFacts }) {
  const items: { label: string; value: string }[] = [];

  items.push({
    label: "Commits",
    value: facts.commitCount === null ? "unknown" : facts.commitCount.toLocaleString(),
  });

  items.push({
    label: "Contributors",
    value: `${facts.contributorCount}${facts.moreContributors ? "+" : ""}`,
  });

  if (facts.ownerCommitShare !== null) {
    items.push({ label: `By ${facts.owner}`, value: `${facts.ownerCommitShare}%` });
  } else if (facts.ownerType === "Organization") {
    items.push({ label: "Owner", value: "an organization" });
  }

  items.push({
    label: "Files",
    value:
      facts.fileCount === null
        ? "unknown"
        : `${facts.fileCount}${facts.treeTruncated ? "+" : ""}${facts.totalBytes ? ` · ${formatBytes(facts.totalBytes)}` : ""}`,
  });

  items.push({
    label: "Test files",
    value: facts.treeTruncated ? `${facts.testFileCount}+` : String(facts.testFileCount),
  });

  items.push({
    label: "CI",
    value:
      facts.workflowFiles.length > 0
        ? `${facts.workflowFiles.length} workflow${facts.workflowFiles.length === 1 ? "" : "s"}`
        : facts.otherCiFiles.length > 0
          ? "configured"
          : "none",
  });

  items.push({
    label: "Languages",
    value:
      Object.entries(facts.languageShare)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, share]) => `${name} ${share}%`)
        .join(" · ") || "none",
  });

  // How long it was worked on, not only when it last was. Two commits nine
  // minutes apart and forty over three months read very differently, and
  // "last commit" alone cannot tell them apart.
  items.push({
    label: "Worked on",
    value:
      facts.activeDays === null
        ? "unknown"
        : `${facts.activeDays} ${facts.activeDays === 1 ? "day" : "days"}${
            facts.recentCommits.length ? ` in last ${facts.recentCommits.length}` : ""
          }`,
  });

  items.push({
    label: "Last commit",
    value: facts.lastCommitAt
      ? inEventZone(facts.lastCommitAt, { month: "short", day: "numeric", year: "numeric" })
      : "unknown",
  });

  const notes: string[] = [];
  if (facts.isFork) notes.push(`A fork${facts.forkedFrom ? ` of ${facts.forkedFrom}` : ""}.`);
  if (facts.isArchived) notes.push("Archived on GitHub.");
  if (facts.license) notes.push(`${facts.license} licensed.`);
  if (facts.stars || facts.forks) notes.push(`${facts.stars} stars, ${facts.forks} forks.`);

  return (
    <>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] text-faint">{item.label}</dt>
            <dd className="mt-0.5 font-mono text-[13px] font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>

      {facts.directories.length > 0 && (
        <div className="mt-3.5">
          <p className="text-[11px] text-faint">Where the content is</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {facts.directories.slice(0, 6).map((entry) => (
              <li key={entry.path} className="font-mono text-[12px] text-muted">
                {entry.path}{" "}
                <span className="text-faint">
                  {entry.files}f · {formatBytes(entry.bytes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.length > 0 && <p className="mt-2.5 text-[12px] text-muted">{notes.join(" ")}</p>}
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function FindingList({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "positive" | "neutral" | "warning";
  items: string[];
}) {
  if (items.length === 0) return null;

  const dot = {
    positive: "bg-positive",
    neutral: "bg-faint",
    warning: "bg-warning",
  } as const;

  return (
    <div>
      <p className="text-[12px] font-semibold text-muted">{label}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex max-w-160 gap-2.5 text-[13px] leading-snug">
            <span
              aria-hidden
              className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot[tone])}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

type View = {
  summary: string;
  specificity: number | null;
  specificityReason: string;
  claims: Claim[];
  dropped: number;
  outcome: RepoOutcome | null;
  facts: RepoFacts | null;
  comparison: Comparison | null;
  repoUrl: string | null;
  model: string | null;
  generatedAt: string | null;
};

/** A reading that is still arriving. */
function fromLive(live: Live): View {
  return {
    summary: live.summary,
    specificity: live.specificity,
    specificityReason: live.specificityReason,
    claims: live.claims,
    dropped: live.dropped,
    outcome: live.outcome,
    facts: live.facts,
    comparison: live.comparison,
    repoUrl: live.facts ? live.facts.url : null,
    model: live.model,
    generatedAt: live.finishedAt,
  };
}

/** A reading somebody already produced, possibly a different organizer. */
function fromStored(insight: StoredInsight | null): View | null {
  if (!insight) return null;

  return {
    summary: insight.summary,
    specificity: insight.specificity,
    specificityReason: insight.specificity_reason,
    claims: insight.claims,
    dropped: 0,
    outcome: insight.repo_outcome,
    facts: insight.repo_stats,
    comparison: insight.repo_findings,
    repoUrl: insight.repo_url,
    model: insight.model,
    generatedAt: insight.generated_at,
  };
}

type StreamEvent =
  | { type: "stage"; label: string }
  | { type: "outcome"; outcome: RepoOutcome }
  | { type: "facts"; facts: RepoFacts }
  | { type: "summary"; text: string }
  | {
      type: "reading";
      reading: { summary: string; specificity: number; specificity_reason: string; claims: Claim[] };
      dropped: number;
    }
  | { type: "comparison"; comparison: Comparison | null }
  | { type: "done"; remaining: number | null; model: string; generatedAt: string }
  | { type: "error"; message: string };
