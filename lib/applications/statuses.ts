import type { Database } from "../database.types.ts";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

/**
 * How each status is written and drawn.
 *
 * This is data rather than presentation, so it lives outside the badge
 * component that renders it. Three surfaces need the label without wanting a
 * React element: the CSV export, the command-line tools, and the MCP server,
 * none of which can import a .tsx file.
 *
 * Every status carries a distinct glyph as well as a tone. Colour alone would
 * not separate accepted from rejected for a reviewer with a colour vision
 * deficiency, and these appear a few thousand times in a scan down the
 * applications table. The glyph also survives a greyscale print or a
 * screenshot pasted into Slack.
 */
export const STATUS_STYLES: Record<
  ApplicationStatus,
  { label: string; tone: "neutral" | "info" | "gold" | "positive" | "warning" | "danger"; glyph: string }
> = {
  draft: { label: "Draft", tone: "neutral", glyph: "○" },
  submitted: { label: "Submitted", tone: "info", glyph: "●" },
  under_review: { label: "Under review", tone: "gold", glyph: "◐" },
  accepted: { label: "Accepted", tone: "positive", glyph: "✓" },
  waitlisted: { label: "Waitlisted", tone: "warning", glyph: "⋯" },
  rejected: { label: "Rejected", tone: "danger", glyph: "✕" },
};

export function statusLabel(status: ApplicationStatus): string {
  return STATUS_STYLES[status].label;
}
