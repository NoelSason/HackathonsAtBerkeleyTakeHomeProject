"use client";

import { useFormStatus } from "react-dom";
import { deleteDraft } from "@/app/(portal)/apply/actions";

/**
 * Discards a draft, and says so while it is happening.
 *
 * The action deletes the row and then revalidates the dashboard, which is two
 * round trips before anything on screen changes. Without a pending state the
 * button sat there for a second or more looking like the click had missed,
 * and the natural response to that is to click it again — on a control whose
 * whole job is to destroy something.
 *
 * useFormStatus only reads the state of a form it is rendered inside, which
 * is why the button is its own component rather than a prop on the form.
 */
export function DiscardDraft({ applicationId }: { applicationId: string }) {
  return (
    <form action={deleteDraft}>
      <input type="hidden" name="application_id" value={applicationId} />
      <DiscardButton />
    </form>
  );
}

function DiscardButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[13px] text-muted transition-colors hover:text-danger disabled:opacity-50"
    >
      {pending ? "Discarding…" : "Discard"}
    </button>
  );
}
