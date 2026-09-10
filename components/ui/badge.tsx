import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "info" | "gold" | "positive" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-muted",
  info: "bg-berkeley-soft text-berkeley",
  gold: "bg-gold-soft text-gold-deep",
  positive: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-faint",
  info: "bg-berkeley",
  gold: "bg-gold",
  positive: "bg-positive",
  warning: "bg-warning",
  danger: "bg-danger",
};

/**
 * A status pill.
 *
 * The dot is not decoration. Roughly one in twelve men has some form of
 * colour vision deficiency, and the tinted fills alone would not separate
 * "accepted" from "rejected" for them, so every badge also carries its
 * label as text and the dot only reinforces it.
 */
export function Badge({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}
