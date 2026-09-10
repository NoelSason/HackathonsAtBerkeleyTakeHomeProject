import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/*
 * Shared by the text input, textarea and select so the three line up
 * exactly when they sit next to each other in a form.
 */
export const CONTROL_BASE =
  "w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink " +
  "placeholder:text-faint transition-colors hover:border-faint " +
  "focus:border-berkeley disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_BASE, "h-10", className)} {...props} />;
}
