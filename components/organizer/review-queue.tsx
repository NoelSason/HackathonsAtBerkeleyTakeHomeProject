"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { nextApplication, type QueueItem } from "@/app/organizer/review/actions";
import { submitReview } from "@/app/organizer/actions";
import { ApplicationAnswers } from "@/components/organizer/application-answers";
import { ROLE_COPY } from "@/lib/applications/roles";
import { generaliseSchool } from "@/lib/applications/school-groups";
import { APPLICATION_FORMS } from "@/lib/applications/forms";
import { cn } from "@/lib/cn";

const SCORES = [1, 2, 3, 4, 5] as const;

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

/**
 * One application at a time, identity hidden, scored from the keyboard.
 *
 * The whole screen is built around the two things that actually go wrong at
 * this volume. Throughput: a reviewer should never choose what to read next,
 * or move their hands to the mouse to score. Consistency: the name and the
 * school are the strongest bias cues in an application, so they are not on
 * screen while the score is being decided.
 *
 * Revealing is possible but gated behind having chosen a score. Looking is
 * sometimes legitimate, and blocking it outright would just push reviewers
 * into a second tab; requiring the score first means the judgement is
 * already recorded before the name can influence it.
 */
export function ReviewQueue({ initial }: { initial: QueueItem }) {
  const [item, setItem] = useState(initial);
  const [score, setScore] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Null until an effect starts it. Reading the clock during render would
  // make the value depend on when React re-renders rather than on when the
  // application actually appeared.
  const startedAt = useRef<number | null>(null);
  const [durations, setDurations] = useState<number[]>([]);

  const application = item.application;

  useEffect(() => {
    startedAt.current = Date.now();
  }, [application?.id]);

  const advance = useCallback(
    (skipIds: string[]) => {
      startTransition(async () => {
        const next = await nextApplication(skipIds);
        setItem(next);
        setScore(null);
        setNotes("");
        setRevealed(false);
      });
    },
    [],
  );

  const submit = useCallback(() => {
    if (!application || score === null) return;
    setError(null);

    const elapsed = startedAt.current === null ? 0 : (Date.now() - startedAt.current) / 1000;

    startTransition(async () => {
      const result = await submitReview({ applicationId: application.id, score, notes });
      if (result.error) {
        setError(result.error);
        return;
      }
      // Only counted once the review actually saved, so a failed submit does
      // not quietly improve the reviewer's average.
      setDurations((current) => [...current.slice(-9), elapsed]);
      advance(skipped);
    });
  }, [application, score, notes, skipped, advance]);

  const skip = useCallback(() => {
    if (!application) return;
    const next = [...skipped, application.id];
    setSkipped(next);
    advance(next);
  }, [application, skipped, advance]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";

      if (event.key >= "1" && event.key <= "5" && !typing) {
        event.preventDefault();
        setScore(Number(event.key));
        return;
      }

      // Enter submits, but inside the notes field it should still make a new
      // line, so there it needs a modifier.
      if (event.key === "Enter" && (!typing || event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
        return;
      }

      if ((event.key === "s" || event.key === "S") && !typing) {
        event.preventDefault();
        skip();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit, skip]);

  const averageSeconds =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  if (!application) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-bold">The queue is empty.</p>
        <p className="mt-2 max-w-100 text-sm text-muted">
          Every application waiting for a read has either reached its target or already been read
          by you. New submissions will appear here.
        </p>
        {skipped.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSkipped([]);
              advance([]);
            }}
            className="mt-6 text-sm font-semibold text-berkeley hover:underline"
          >
            Bring back the {skipped.length} I skipped
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex flex-1 justify-center overflow-hidden px-4 pt-9">
        <article className="w-full max-w-205 rounded-t-control border border-b-0 border-line bg-surface px-6 py-9 sm:px-12">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-mono text-[12px]",
                  revealed
                    ? "border-gold-deep/30 bg-gold-soft text-gold-deep"
                    : "border-line bg-sunken text-muted",
                )}
              >
                {revealed ? "◉ IDENTITY SHOWN" : "◎ IDENTITY HIDDEN"}
              </span>
              <span className="font-mono text-[12px] text-faint">
                APP-{application.displayId} · {ROLE_COPY[application.role].label.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {averageSeconds !== null && (
                <span className="font-mono text-[12px] text-muted">
                  avg {formatSeconds(averageSeconds)}
                </span>
              )}
              <button
                type="button"
                onClick={() => setRevealed(true)}
                disabled={score === null || revealed}
                title={score === null ? "Choose a score first" : "Show who this is"}
                className="text-[12px] font-semibold text-berkeley transition-colors hover:underline disabled:cursor-not-allowed disabled:text-faint disabled:no-underline"
              >
                {revealed ? application.fullName : "Reveal"}
              </button>
            </div>
          </header>

          <dl className="grid gap-4 border-b border-line py-5 sm:grid-cols-3">
            <div>
              <dt className="text-[12px] text-faint">School</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {revealed ? (application.school ?? "Not given") : generaliseSchool(application.school)}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-faint">Reads so far</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {application.reviewCount} of {APPLICATION_FORMS[application.role].reviewsRequired}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-faint">Still waiting</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {item.progress.outstanding} in the queue
              </dd>
            </div>
          </dl>

          <div className="pt-5">
            <ApplicationAnswers
              role={application.role}
              responses={application.responses}
              blind={!revealed}
            />
          </div>
        </article>
      </div>

      <div className="shrink-0 border-t border-line-strong bg-surface px-4 py-4 sm:px-12">
        <div className="mx-auto flex max-w-205 flex-wrap items-center gap-5">
          <div className="flex gap-2" role="group" aria-label="Score out of five">
            {SCORES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={score === value}
                onClick={() => setScore(value)}
                className={cn(
                  "h-11 w-11 rounded-control border font-mono text-base transition-colors",
                  score === value
                    ? "border-[1.5px] border-berkeley bg-berkeley-soft font-semibold text-berkeley outline-3 outline-gold-soft"
                    : "border-line-strong bg-ground shadow-[0_1.5px_0_var(--color-line-strong)] hover:border-faint",
                )}
              >
                {value}
              </button>
            ))}
          </div>

          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="One line for the committee…"
            aria-label="Notes for the committee"
            maxLength={2000}
            className="min-w-50 flex-1 rounded-control border border-line-strong bg-ground px-3.5 py-3 text-sm placeholder:text-faint focus:border-berkeley"
          />

          {error && <span className="text-[13px] font-medium text-danger">{error}</span>}

          <div className="flex items-center gap-4 text-[13px] text-muted">
            <button type="button" onClick={skip} disabled={isPending} className="flex items-center gap-1.5">
              <kbd className="rounded-pill border border-line-strong bg-ground px-1.5 py-0.5 font-mono text-[11px]">
                S
              </kbd>
              Skip
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={score === null || isPending}
              className="flex items-center gap-2 rounded-control bg-berkeley px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-berkeley-deep disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Submit"}
              <kbd className="rounded-pill border border-white/40 px-1.5 py-0.5 font-mono text-[11px]">
                ↵
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
