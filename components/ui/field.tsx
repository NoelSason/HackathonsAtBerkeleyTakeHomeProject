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
 * Passing those four attributes back to the caller keeps that wiring
 * impossible to forget, which matters here because every question on
 * every application form renders through this one component.
 */
export function Field({
  id,
  label,
  help,
  error,
  required = false,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: (props: ControlProps) => ReactNode;
}) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  // Both ids when both are present, so neither message is skipped.
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>

      {help && (
        <p id={helpId} className="text-[13px] leading-snug text-muted">
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
        <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
