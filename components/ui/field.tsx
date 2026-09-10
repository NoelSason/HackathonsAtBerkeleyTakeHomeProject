import type { ReactNode } from "react";

type ControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean | undefined;
  required: boolean;
};

/**
 * Label, help text, control and error message as one labelled unit.
 *
 * The control is supplied as a function rather than as plain children
 * because the accessible wiring has to reach the input itself: the label
 * needs the input's `id`, and a screen reader only announces the help and
 * error text if the input points at them through `aria-describedby`.
 * Handing those attributes back to the caller makes that wiring impossible
 * to forget, which matters because every question on every application form
 * renders through this one component.
 *
 * Optional fields are marked, not required ones. Most questions here are
 * required, so asterisking them would put a marker on nearly every line and
 * leave the reader scanning for the absence of one.
 */
export function Field({
  id,
  label,
  help,
  error,
  required = false,
  optionalHint = false,
  counter,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  optionalHint?: boolean;
  /** Live character count, e.g. "412 / 1000". */
  counter?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  // Both ids when both are present, so neither message is skipped.
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <label id={`${id}-label`} htmlFor={id} className="text-[13px] font-semibold text-ink">
          {label}
          {optionalHint && <span className="ml-1.5 font-normal text-faint">optional</span>}
        </label>

        {counter && <span className="shrink-0 font-mono text-[12px] text-faint">{counter}</span>}
      </div>

      {help && (
        <p id={helpId} className="mb-1.5 text-[13px] leading-snug text-muted">
          {help}
        </p>
      )}

      {children({
        id,
        "aria-describedby": describedBy,
        // `undefined` rather than `false` so the attribute is absent when
        // valid; aria-invalid="false" is legal but noisier in the DOM.
        "aria-invalid": error ? true : undefined,
        required,
      })}

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
