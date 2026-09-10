import { cn } from "@/lib/cn";
import type { Database } from "@/lib/database.types";
import { inEventZone } from "@/lib/event";

type Status = Database["public"]["Enums"]["application_status"];

/**
 * Where an application sits between arriving and being decided.
 *
 * The six database statuses collapse to four visible steps, because accepted,
 * waitlisted and rejected are all the same milestone from the applicant's
 * side: a decision landed. Which one it was is on the badge above; the
 * timeline answers the different question of how far along they are.
 */
const STEPS = ["Draft", "Submitted", "Under review", "Decision"] as const;

const STEP_INDEX: Record<Status, number> = {
  draft: 0,
  submitted: 1,
  under_review: 2,
  accepted: 3,
  waitlisted: 3,
  rejected: 3,
};

function shortDateTime(value: string | null): string | null {
  if (!value) return null;
  return inEventZone(value, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StatusTimeline({
  status,
  createdAt,
  submittedAt,
  decisionLabel,
}: {
  status: Status;
  createdAt: string;
  submittedAt: string | null;
  decisionLabel: string;
}) {
  const current = STEP_INDEX[status];

  const captions: (string | null)[] = [
    shortDateTime(createdAt),
    shortDateTime(submittedAt),
    current === 2 ? "in progress" : current > 2 ? "complete" : null,
    current === 3 ? shortDateTime(submittedAt) : `by ${decisionLabel}`,
  ];

  return (
    <div className="relative">
      {/* The track sits behind the dots; the filled portion stops at the
          current step rather than running the full width. */}
      <div aria-hidden className="absolute top-1.5 right-1.5 left-1.5 h-[1.5px] bg-line" />
      <div
        aria-hidden
        className="absolute top-1.5 left-1.5 h-[1.5px] bg-berkeley"
        style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
      />

      <ol className="relative grid grid-cols-4">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;

          return (
            <li key={step}>
              <span
                aria-hidden
                className={cn(
                  "block h-3 w-3 rounded-full",
                  done && "bg-berkeley",
                  active && "border-[3px] border-berkeley bg-surface outline-3 outline-gold-soft",
                  !done && !active && "border-[1.5px] border-line-strong bg-surface",
                )}
              />
              <p
                className={cn(
                  "mt-3 text-[13px]",
                  active ? "font-bold text-ink" : done ? "font-semibold text-ink" : "font-semibold text-faint",
                )}
              >
                {step}
              </p>
              {captions[index] && (
                <p className="mt-0.5 font-mono text-[12px] text-faint">{captions[index]}</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
