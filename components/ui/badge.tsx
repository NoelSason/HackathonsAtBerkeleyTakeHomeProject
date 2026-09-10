import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/database.types";
import { STATUS_STYLES, statusLabel } from "@/lib/applications/statuses";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export type Tone = "neutral" | "info" | "gold" | "positive" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-muted border border-line",
  info: "bg-berkeley-soft text-berkeley",
  gold: "bg-gold-soft text-gold-deep",
  positive: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  glyph,
  children,
}: {
  tone?: Tone;
  glyph?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        TONES[tone],
      )}
    >
      {glyph && <span aria-hidden>{glyph}</span>}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, tone, glyph } = STATUS_STYLES[status];
  return (
    <Badge tone={tone} glyph={glyph}>
      {label}
    </Badge>
  );
}

// Re-exported so callers that already import from this module keep working.
export { statusLabel };
