/**
 * The one place any date about this year's event is written down.
 *
 * These are not in the database on purpose. They change once a year, an
 * organizer editing them would be editing a deploy anyway, and putting them
 * in Postgres would mean a table, a query and a cache boundary to render a
 * handful of lines of text.
 */
export const EVENT = {
  name: "Cal Hacks 12.0",
  shortName: "Cal Hacks",
  venue: "UC Berkeley",
  dateRange: "October 23–25, 2026",

  /** Applications close at the end of October 2, Pacific. */
  applicationsClose: new Date("2026-10-02T23:59:00-07:00"),
  applicationsCloseLabel: "October 2, 11:59 PM PT",
  decisionsLabel: "October 9",
} as const;

export const TIMELINE = [
  { date: "Aug 24", label: "Applications open", done: true },
  { date: "Sep 18", label: "Priority deadline", done: true },
  { date: "Oct 2", label: "Applications close", done: false },
  { date: "Oct 9", label: "Decisions released", done: false },
  { date: "Oct 23–25", label: EVENT.name, done: false },
] as const;

/** Whole days between now and the deadline; never negative. */
export function daysUntilDeadline(now: Date = new Date()): number {
  const millis = EVENT.applicationsClose.getTime() - now.getTime();
  return Math.max(0, Math.ceil(millis / 86_400_000));
}
