import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/database.types";

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

/*
 * Every status gets a tone AND a distinct glyph.
 *
 * Colour alone would not separate accepted from rejected for a reviewer with
 * a colour vision deficiency, and these badges appear a few thousand times in
 * a scan down the applications table. The glyph also survives a greyscale
 * print or a screenshot pasted into Slack.
 */
const STATUS_STYLES: Record<ApplicationStatus, { label: string; tone: Tone; glyph: string }> = {
  draft: { label: "Draft", tone: "neutral", glyph: "○" },
  submitted: { label: "Submitted", tone: "info", glyph: "●" },
  under_review: { label: "Under review", tone: "gold", glyph: "◐" },
  accepted: { label: "Accepted", tone: "positive", glyph: "✓" },
  waitlisted: { label: "Waitlisted", tone: "warning", glyph: "⋯" },
  rejected: { label: "Rejected", tone: "danger", glyph: "✕" },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, tone, glyph } = STATUS_STYLES[status];
  return (
    <Badge tone={tone} glyph={glyph}>
      {label}
    </Badge>
  );
}

export function statusLabel(status: ApplicationStatus) {
  return STATUS_STYLES[status].label;
}
