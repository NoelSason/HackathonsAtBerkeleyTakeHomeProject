"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetMyReviews } from "@/app/organizer/actions";

/**
 * Takes back every review this organizer has written.
 *
 * Useful when you have been reading for a while and realise your first dozen
 * scores were calibrated against nothing — the queue serves what you have not
 * read, so without this there is no way to go back over them.
 *
 * Scoped to the person clicking. The function behind it takes no argument and
 * reads the reviewer from the session, so there is no version of this that
 * reaches somebody else's reviews, including for a director.
 *
 * Two steps rather than a browser confirm(). A native dialog blocks the page
 * and looks like a different application; an inline second click asks the
 * same question without either problem, and it cancels on blur so a stray
 * first click does not leave a loaded button sitting there.
 */
export function ResetReviews({ count }: { count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count === 0) return null;

  function reset() {
    setError(null);
    startTransition(async () => {
      const result = await resetMyReviews();
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <span role="alert" className="text-[12px] font-medium text-danger">
          {error}
        </span>
      )}

      {confirming ? (
        <>
          <span className="text-[12px] text-muted">
            Delete your {count} review{count === 1 ? "" : "s"}?
          </span>
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className="text-[12px] font-semibold text-danger transition-colors hover:underline disabled:opacity-50"
          >
            {isPending ? "Clearing…" : "Yes, clear them"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[12px] text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          onBlur={() => setConfirming(false)}
          className="font-mono text-[12px] text-muted transition-colors hover:text-ink"
        >
          ↺ Reset my reviews ({count})
        </button>
      )}
    </div>
  );
}
