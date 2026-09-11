"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideApplications } from "@/app/organizer/actions";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["application_status"];

const DECISIONS = [
  { status: "accepted", label: "✓ Accept", tone: "positive" },
  { status: "waitlisted", label: "⋯ Waitlist", tone: "warning" },
  { status: "rejected", label: "✕ Reject", tone: "danger" },
] as const;

const TONES = {
  positive: "border-positive text-positive hover:bg-positive hover:text-white",
  warning: "border-warning text-warning hover:bg-warning hover:text-white",
  danger: "border-danger text-danger hover:bg-danger hover:text-white",
} as const;

/** The decision this application currently carries, filled rather than outlined. */
const CHOSEN = {
  positive: "border-positive bg-positive text-white",
  warning: "border-warning bg-warning text-white",
  danger: "border-danger bg-danger text-white",
} as const;

/**
 * The accept, waitlist and reject controls.
 *
 * Rendered only for directors, but that is presentation. The function these
 * call checks is_director() in the database, so a reviewer who forged the
 * request would still be refused.
 *
 * **The current decision is filled in rather than outlined.** Three identical
 * outlined pills say what a director can do and nothing about what they
 * already did — and the status badge that answers it is at the top of the
 * page, out of sight behind the reviews. Clicking Accept used to leave the
 * row looking exactly as it had a moment earlier, which reads as a click that
 * did not land.
 *
 * `submitted` and `under_review` match nothing here on purpose: an
 * application nobody has decided should show no decision.
 */
export function DecisionControls({
  applicationId,
  status,
}: {
  applicationId: string;
  status: Status;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /*
   * Held locally as well as read from the server, so the fill appears on the
   * click rather than after the round trip that revalidates the page. The
   * server value is the truth; this only covers the second in between, and it
   * is dropped again if the write turns out to have failed.
   */
  const [chosen, setChosen] = useState<Status | null>(null);
  const current = chosen ?? status;

  function decide(next: (typeof DECISIONS)[number]["status"]) {
    setError(null);
    setChosen(next);
    startTransition(async () => {
      const result = await decideApplications({ applicationIds: [applicationId], status: next });
      if (result.error) {
        setChosen(null);
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.08em] text-faint">DECISION · DIRECTORS ONLY</p>

      <div className="mt-3 flex gap-2">
        {DECISIONS.map((decision) => {
          const active = current === decision.status;
          return (
            <button
              key={decision.status}
              type="button"
              disabled={isPending}
              aria-pressed={active}
              onClick={() => decide(decision.status)}
              className={cn(
                "flex-1 cursor-pointer rounded-pill border py-2 text-[13px] font-semibold transition-colors disabled:opacity-50",
                active ? CHOSEN[decision.tone] : cn("bg-surface", TONES[decision.tone]),
              )}
            >
              {decision.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
