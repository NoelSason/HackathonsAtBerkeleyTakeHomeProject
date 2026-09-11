"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/app/organizer/actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const SCORES = [1, 2, 3, 4, 5] as const;

/**
 * This organizer's own score and notes for one application.
 *
 * Pre-filled when they have already reviewed it, because the underlying row
 * is keyed on (application, reviewer) and submitting again revises their
 * opinion rather than adding a second one. Showing a blank form would
 * suggest otherwise.
 *
 * Scored from the keyboard, the same 1-5 as the blind queue. Somebody working
 * down a detail page is doing the same job as somebody working down the
 * queue, and having the shortcut in one place and not the other is the kind
 * of inconsistency you only notice by using it for an hour.
 *
 * Enter needs a modifier here, unlike in the queue. The queue is a
 * single-purpose screen where Enter can only mean "submit this score"; this
 * form sits on a page with a notes field, links and decision buttons, so a
 * bare Enter would fire while somebody was mid-sentence.
 */
export function GradeForm({
  applicationId,
  existingScore,
  existingNotes,
}: {
  applicationId: string;
  existingScore: number | null;
  existingNotes: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [score, setScore] = useState<number | null>(existingScore);
  const [notes, setNotes] = useState(existingNotes);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useCallback(() => {
    if (score === null) return;
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await submitReview({ applicationId, score, notes });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }, [applicationId, score, notes, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";

      if (event.key >= "1" && event.key <= "5" && !typing) {
        event.preventDefault();
        setScore(Number(event.key));
        setSaved(false);
        return;
      }

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        save();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.08em] text-faint">YOUR GRADE</p>

      <div className="mt-3 flex gap-1.5" role="group" aria-label="Score out of five">
        {SCORES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={score === value}
            onClick={() => setScore(value)}
            className={cn(
              "flex-1 rounded-pill border py-2 text-center font-mono text-sm transition-colors",
              score === value
                ? "border-[1.5px] border-berkeley bg-berkeley font-semibold text-white"
                : "border-line-strong bg-surface hover:border-faint",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes for the committee…"
        aria-label="Notes for the committee"
        className="mt-2.5 min-h-14"
        maxLength={2000}
      />

      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={save}
        disabled={score === null || isPending}
        className="mt-3 w-full"
      >
        {isPending ? "Saving…" : saved ? "Saved" : existingScore === null ? "Submit review" : "Update review"}
      </Button>

      {/* A shortcut nobody is told about is not a feature. Styled like the
          hints in the review queue, so the two screens read as one tool. */}
      <p className="mt-2.5 flex items-center justify-center gap-1.5 font-mono text-[11px] text-faint">
        <Key>1</Key>–<Key>5</Key>
        <span>to score</span>
        <span aria-hidden>·</span>
        <Key>⌘↵</Key>
        <span>to save</span>
      </p>
    </div>
  );
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded-pill border border-line-strong bg-ground px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </kbd>
  );
}
