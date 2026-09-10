"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideApplications } from "@/app/organizer/actions";
import { cn } from "@/lib/cn";

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

/**
 * The accept, waitlist and reject controls.
 *
 * Rendered only for directors, but that is presentation. The function these
 * call checks is_director() in the database, so a reviewer who forged the
 * request would still be refused.
 */
export function DecisionControls({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(status: (typeof DECISIONS)[number]["status"]) {
    setError(null);
    startTransition(async () => {
      const result = await decideApplications({ applicationIds: [applicationId], status });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.08em] text-faint">DECISION · DIRECTORS ONLY</p>

      <div className="mt-3 flex gap-2">
        {DECISIONS.map((decision) => (
          <button
            key={decision.status}
            type="button"
            disabled={isPending}
            onClick={() => decide(decision.status)}
            className={cn(
              "flex-1 rounded-pill border bg-surface py-2 text-[13px] font-semibold transition-colors disabled:opacity-50",
              TONES[decision.tone],
            )}
          >
            {decision.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
