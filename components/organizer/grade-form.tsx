"use client";

import { useState, useTransition } from "react";
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

  function save() {
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
  }

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
    </div>
  );
}
