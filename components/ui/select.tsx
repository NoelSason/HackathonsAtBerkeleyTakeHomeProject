import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_BASE } from "./input";

/*
 * A native <select> with a drawn chevron.
 *
 * `appearance-none` removes the OS arrow, which is the only way to stop
 * Safari and Chrome rendering visibly different controls side by side.
 * The replacement chevron is `pointer-events-none` so clicking it still
 * falls through to the select and opens the platform picker — the picker
 * itself is worth keeping, since a hand-built listbox would mean
 * reimplementing focus trapping, typeahead and touch behaviour.
 */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL_BASE, "h-10 appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-muted"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
