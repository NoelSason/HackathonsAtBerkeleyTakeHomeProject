"use client";

import { useEffect, useRef, useState } from "react";
import { saveDraft, submitApplication } from "@/app/(portal)/apply/actions";
import {
  APPLICATION_FORMS,
  isSectionComplete,
  type Section,
} from "@/lib/applications/forms";
import { ROLE_COPY, type ApplicationRole } from "@/lib/applications/roles";
import { EVENT, daysUntilDeadline } from "@/lib/event";
import { FieldControl, type FieldValue } from "./field-control";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Responses = Record<string, FieldValue>;

/** How long after the last keystroke a draft is written. */
const AUTOSAVE_DELAY_MS = 900;

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ApplicationForm({
  applicationId,
  role,
  initialResponses,
}: {
  applicationId: string;
  role: ApplicationRole;
  initialResponses: Responses;
}) {
  const form = APPLICATION_FORMS[role];
  const sections = form.sections;
  /** One step past the last section is the review step. */
  const reviewStep = sections.length;

  const [responses, setResponses] = useState<Responses>(initialResponses);
  const [step, setStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Nothing has been typed yet on the first render, and saving there would
  // write the draft back to itself on every page load.
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      const result = await saveDraft(applicationId, role, responses);
      if (result.error) {
        setSaveStatus("error");
        return;
      }
      setSaveStatus("saved");
      setSavedAt(new Date());
    }, AUTOSAVE_DELAY_MS);

    // Each keystroke cancels the previous timer, so a burst of typing writes
    // once at the end rather than once per character.
    return () => clearTimeout(timer);
  }, [responses, applicationId, role]);

  function update(fieldId: string, value: FieldValue) {
    dirty.current = true;
    setResponses((current) => ({ ...current, [fieldId]: value }));
    setFieldErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const result = await submitApplication(applicationId, role, responses);

    // A successful submit redirects, so reaching here means it failed.
    setSubmitting(false);
    setSubmitError(result.error);
    setFieldErrors(result.fieldErrors);

    // Jump to the first section still missing an answer rather than leaving
    // the applicant to hunt for it.
    const firstBadField = Object.keys(result.fieldErrors)[0];
    if (firstBadField) {
      const index = sections.findIndex((section) =>
        section.fields.some((field) => field.id === firstBadField),
      );
      if (index >= 0) setStep(index);
    }
  }

  const completed = sections.map((section) => isSectionComplete(section, responses));
  const allComplete = completed.every(Boolean);
  const currentSection: Section | undefined = sections[step];

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3.5 sm:px-12">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-[18px] w-[18px] rounded-[3px] bg-gold" />
          <span className="text-[15px] font-bold">{ROLE_COPY[role].label} application</span>
          <span className="font-mono text-[12px] text-muted">
            {Math.min(step + 1, reviewStep + 1)} / {reviewStep + 1} SECTIONS
          </span>
        </div>

        <SaveIndicator status={saveStatus} savedAt={savedAt} />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <nav aria-label="Application sections" className="border-b border-line py-6 lg:w-70 lg:border-r lg:border-b-0">
          <ol>
            {sections.map((section, index) => (
              <li key={section.id}>
                <SectionLink
                  index={index}
                  title={section.title}
                  active={step === index}
                  complete={completed[index]}
                  onClick={() => setStep(index)}
                />
              </li>
            ))}
            <li>
              <SectionLink
                index={reviewStep}
                title="Review & submit"
                active={step === reviewStep}
                complete={false}
                onClick={() => setStep(reviewStep)}
              />
            </li>
          </ol>

          <div className="mt-8 border-t border-line px-8 pt-6">
            <p className="font-mono text-[11px] tracking-[0.08em] text-faint">DEADLINE</p>
            <p className="mt-1.5 text-sm font-semibold">{EVENT.applicationsCloseLabel}</p>
            <p className="mt-0.5 text-[13px] text-muted">{daysUntilDeadline()} days left</p>
          </div>
        </nav>

        <div className="max-w-180 flex-1 px-6 py-10 sm:px-16">
          {currentSection ? (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight">{currentSection.title}</h2>
              {currentSection.blurb && <p className="mt-1.5 text-muted">{currentSection.blurb}</p>}

              <div className="mt-9 space-y-7">
                {currentSection.fields.map((field) => (
                  <FieldControl
                    key={field.id}
                    field={field}
                    value={responses[field.id]}
                    error={fieldErrors[field.id]}
                    onChange={(value) => update(field.id, value)}
                  />
                ))}
              </div>
            </>
          ) : (
            <ReviewStep
              role={role}
              responses={responses}
              completed={completed}
              onJump={setStep}
            />
          )}

          <div className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-7">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-sm font-semibold text-muted transition-colors hover:text-ink"
              >
                ← {sections[step - 1]?.title ?? "Back"}
              </button>
            ) : (
              <span />
            )}

            {step < reviewStep ? (
              <Button type="button" onClick={() => setStep(step + 1)} className="h-11 px-7">
                Continue to {sections[step + 1]?.title ?? "Review & submit"}
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                {submitError && (
                  <p role="alert" className="text-[13px] font-medium text-danger">
                    {submitError}
                  </p>
                )}
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !allComplete}
                  className="h-11 px-7"
                >
                  {submitting ? "Submitting…" : "Submit application"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLink({
  index,
  title,
  active,
  complete,
  onClick,
}: {
  index: number;
  title: string;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "step" : undefined}
      className={cn(
        "flex w-full items-center gap-3 px-8 py-2.5 text-left text-sm transition-colors",
        active
          ? "-ml-px border-l-[3px] border-gold bg-surface font-bold text-ink"
          : complete
            ? "text-muted hover:text-ink"
            : "text-faint hover:text-muted",
      )}
    >
      <span className={cn("font-mono text-[12px]", complete && !active ? "text-positive" : active ? "text-berkeley" : "")}>
        {complete && !active ? "✓" : index + 1}
      </span>
      {title}
    </button>
  );
}

function SaveIndicator({ status, savedAt }: { status: SaveStatus; savedAt: Date | null }) {
  if (status === "idle") return <span />;

  if (status === "error") {
    return (
      <span role="status" className="flex items-center gap-2 font-mono text-[12px] text-danger">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-danger" />
        Not saved
      </span>
    );
  }

  if (status === "saving" || !savedAt) {
    return (
      <span role="status" className="flex items-center gap-2 font-mono text-[12px] text-muted">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-faint" />
        Saving…
      </span>
    );
  }

  return (
    <span role="status" className="flex items-center gap-2 font-mono text-[12px] text-muted">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-positive" />
      Saved <RelativeTime since={savedAt} />
    </span>
  );
}

/**
 * "12s ago", kept current by its own timer.
 *
 * The elapsed time is held in state and recomputed on an interval rather
 * than read during render. Calling Date.now() in a render body makes the
 * output depend on whenever React happens to re-render, which is both
 * unpredictable and the impurity the rules-of-react lint rejects.
 */
function RelativeTime({ since }: { since: Date }) {
  const [label, setLabel] = useState("just now");

  useEffect(() => {
    function update() {
      const seconds = Math.round((Date.now() - since.getTime()) / 1000);
      setLabel(
        seconds < 10
          ? "just now"
          : seconds < 60
            ? `${seconds}s ago`
            : `${Math.round(seconds / 60)}m ago`,
      );
    }

    update();
    const interval = setInterval(update, 10_000);
    return () => clearInterval(interval);
  }, [since]);

  return <>{label}</>;
}

function ReviewStep({
  role,
  responses,
  completed,
  onJump,
}: {
  role: ApplicationRole;
  responses: Responses;
  completed: boolean[];
  onJump: (index: number) => void;
}) {
  const sections = APPLICATION_FORMS[role].sections;

  return (
    <>
      <h2 className="text-2xl font-extrabold tracking-tight">Review &amp; submit</h2>
      <p className="mt-1.5 text-muted">
        You can keep editing after you submit, right up until the deadline.
      </p>

      <div className="mt-9 space-y-8">
        {sections.map((section, index) => (
          <section key={section.id}>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <h3 className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">
                {section.title}
              </h3>
              <button
                type="button"
                onClick={() => onJump(index)}
                className="text-[13px] font-semibold text-berkeley hover:underline"
              >
                Edit
              </button>
            </div>

            {!completed[index] && (
              <p className="mt-2 text-[13px] font-medium text-danger">
                Something in this section still needs an answer.
              </p>
            )}

            <dl className="mt-3 space-y-3">
              {section.fields.map((field) => {
                const value = responses[field.id];
                const display = Array.isArray(value) ? value.join(", ") : (value ?? "");

                return (
                  <div key={field.id} className="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
                    <dt className="text-[13px] text-muted">{field.label}</dt>
                    <dd className={cn("text-sm", display ? "text-ink" : "text-faint")}>
                      {display || "Not answered"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
