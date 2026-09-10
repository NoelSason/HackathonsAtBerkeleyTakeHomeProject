"use client";

import { Field as FieldShell } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { Field } from "@/lib/applications/forms";

export type FieldValue = string | string[];

/**
 * Renders any one question.
 *
 * Every question in the portal, across all four applications, comes through
 * this switch. That is what keeps the four account types from each growing
 * their own form component with their own subtly different label spacing and
 * validation messages.
 */
export function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: FieldValue | undefined;
  error?: string;
  onChange: (value: FieldValue) => void;
}) {
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];

  return (
    <FieldShell
      id={field.id}
      label={field.label}
      help={field.help}
      error={error}
      required={field.required}
      optionalHint={!field.required}
      counter={
        field.type === "long_text" && field.maxLength
          ? `${text.length} / ${field.maxLength}`
          : undefined
      }
    >
      {(control) => {
        switch (field.type) {
          case "long_text":
            return (
              <Textarea
                {...control}
                value={text}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                onChange={(event) => onChange(event.target.value)}
              />
            );

          case "select":
            return (
              <Select {...control} value={text} onChange={(event) => onChange(event.target.value)}>
                <option value="">Select…</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            );

          case "multi_select":
            // A row of toggles rather than a multiple <select>, which is
            // close to unusable on a phone and invisible as to what is
            // currently chosen. `aria-pressed` is what carries that state to
            // a screen reader, since the styling alone cannot.
            return (
              <div className="flex flex-wrap gap-2.5" role="group" aria-labelledby={`${field.id}-label`}>
                {field.options?.map((option) => {
                  const chosen = list.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={chosen}
                      onClick={() =>
                        onChange(
                          chosen ? list.filter((item) => item !== option) : [...list, option],
                        )
                      }
                      className={cn(
                        "rounded-control border px-4 py-2 text-sm transition-colors",
                        chosen
                          ? "border-berkeley bg-berkeley-soft font-semibold text-berkeley"
                          : "border-line-strong bg-surface text-muted hover:border-faint hover:text-ink",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            );

          case "url":
          case "short_text":
            return (
              <Input
                {...control}
                type={field.type === "url" ? "url" : "text"}
                inputMode={field.type === "url" ? "url" : undefined}
                value={text}
                placeholder={field.placeholder}
                className={field.type === "url" ? "font-mono text-[14px]" : undefined}
                onChange={(event) => onChange(event.target.value)}
              />
            );
        }
      }}
    </FieldShell>
  );
}
