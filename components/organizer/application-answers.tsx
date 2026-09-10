import { APPLICATION_FORMS } from "@/lib/applications/forms";
import type { ApplicationRole } from "@/lib/applications/roles";

function display(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return typeof value === "string" ? value : "";
}

/**
 * An application rendered for reading rather than editing.
 *
 * The layout comes from the field type, not from a per-role template: short
 * answers pack into a grid, long answers get their own full-width block with
 * the question as a heading. That is what lets one component render a hacker
 * essay and a volunteer shift list without knowing which it has.
 *
 * In `blind` mode, link fields are dropped. A portfolio URL usually contains
 * the applicant's name or handle, so leaving it in would undo the anonymity
 * the rest of the queue is built around.
 */
export function ApplicationAnswers({
  role,
  responses,
  blind = false,
}: {
  role: ApplicationRole;
  responses: Record<string, unknown>;
  blind?: boolean;
}) {
  const sections = APPLICATION_FORMS[role].sections;

  const shortFields = sections
    .flatMap((section) => section.fields)
    .filter((field) => field.type !== "long_text")
    .filter((field) => !(blind && field.type === "url"))
    .filter((field) => display(responses[field.id]) !== "");

  const essays = sections
    .flatMap((section) => section.fields)
    .filter((field) => field.type === "long_text")
    .filter((field) => display(responses[field.id]) !== "");

  return (
    <div>
      {shortFields.length > 0 && (
        <dl className="grid gap-5 border-b border-line pb-7 sm:grid-cols-3">
          {shortFields.map((field) => (
            <div key={field.id}>
              <dt className="text-[12px] text-faint">{field.label}</dt>
              <dd className="mt-0.5 text-sm font-medium">{display(responses[field.id])}</dd>
            </div>
          ))}
        </dl>
      )}

      {essays.map((field) => (
        <section key={field.id} className="mt-7">
          <h3 className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">
            {field.label}
          </h3>
          <p className="mt-3 max-w-160 text-[15px] leading-relaxed whitespace-pre-line">
            {display(responses[field.id])}
          </p>
        </section>
      ))}
    </div>
  );
}
