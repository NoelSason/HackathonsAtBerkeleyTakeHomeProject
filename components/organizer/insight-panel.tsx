"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestInsight } from "@/app/organizer/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { inEventZone } from "@/lib/event";

export type StoredInsight = {
  summary: string;
  specificity: number;
  specificity_reason: string;
  repo_url: string | null;
  repo_stats: Record<string, unknown> | null;
  repo_findings: { corroborates: string[]; adds: string[]; discrepancies: string[] } | null;
  model: string;
  generated_at: string;
};

const SPECIFICITY_LABELS = ["", "No checkable detail", "Largely generic", "Some specifics", "Mostly concrete", "Highly concrete"];

/**
 * A reading aid for the committee, not a second opinion.
 *
 * Everything on this panel is descriptive: what the applicant said, how much
 * checkable evidence the writing contains, and how a linked repository lines
 * up with the claims. There is deliberately no score, no ranking and no
 * recommendation anywhere in it — a number here would anchor the reviewer,
 * which is the exact failure the blind queue and the calibration view exist
 * to prevent.
 *
 * The raw repository facts are shown alongside, so a reviewer can check the
 * model's reading rather than take it on trust.
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await requestInsight(applicationId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section className="mt-9 rounded-control border border-line bg-sunken px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.08em] text-faint">READING AID</h2>
        {insight && (
          <p className="font-mono text-[11px] text-faint">
            {insight.model} ·{" "}
            {inEventZone(insight.generated_at, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {!insight && (
        <div className="mt-3">
          <p className="text-sm text-muted">
            Summarises the written answers, rates how much checkable detail they contain, and
            compares any linked repository against what was claimed. It never scores an applicant
            or suggests a decision.
          </p>

          {canGenerate ? (
            <Button type="button" onClick={generate} disabled={isPending} className="mt-4" size="sm">
              {isPending ? "Reading…" : "Read this application"}
            </Button>
          ) : (
            <p className="mt-3 text-[13px] font-medium text-muted">
              Submit your own score first, then this becomes available.
            </p>
          )}

          {error && (
            <p role="alert" className="mt-3 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      )}

      {insight && (
        <div className="mt-4 space-y-6">
          <p className="max-w-160 text-[15px] leading-relaxed">{insight.summary}</p>

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
                      step <= insight.specificity ? "bg-berkeley" : "bg-line",
                    )}
                  />
                ))}
              </span>
              <span className="text-[13px] font-semibold">
                {SPECIFICITY_LABELS[insight.specificity] ?? ""}
              </span>
            </div>

            <p className="mt-2 max-w-160 text-[13px] leading-snug text-muted">
              {insight.specificity_reason}
            </p>
            <p className="mt-1.5 max-w-160 text-[12px] text-faint">
              This measures how much of the writing can be checked, not how good the applicant is.
              A plain account of one small real thing rates high.
            </p>
          </div>

          {insight.repo_findings && (
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-[11px] tracking-[0.08em] text-faint">
                  LINKED REPOSITORY
                </span>
                {insight.repo_url && (
                  <a
                    href={insight.repo_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-[12px] text-berkeley hover:underline"
                  >
                    {insight.repo_url.replace("https://github.com/", "")}
                  </a>
                )}
              </div>

              <div className="mt-3 space-y-3">
                <FindingList label="Backs up the essay" tone="positive" items={insight.repo_findings.corroborates} />
                <FindingList label="Not mentioned in the essay" tone="neutral" items={insight.repo_findings.adds} />
                <FindingList label="Does not line up" tone="warning" items={insight.repo_findings.discrepancies} />
              </div>

              {insight.repo_stats && (
                <details className="mt-4">
                  <summary className="cursor-pointer font-mono text-[11px] tracking-[0.08em] text-faint hover:text-muted">
                    WHAT IT READ
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-control border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted">
                    {JSON.stringify(insight.repo_stats, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {canGenerate && (
            <button
              type="button"
              onClick={generate}
              disabled={isPending}
              className="text-[13px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              {isPending ? "Reading…" : "Read it again"}
            </button>
          )}

          {error && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
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
          <li key={item} className="flex gap-2.5 text-[13px] leading-snug">
            <span aria-hidden className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot[tone])} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
