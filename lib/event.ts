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

/**
 * The milestones shown on the landing page.
 *
 * `on` is the moment each one passes, so whether it has happened is derived
 * rather than asserted. Hand-written `done: true` flags were wrong within
 * days of being typed: the priority deadline was marked complete a week
 * before it arrived, and nothing would have corrected it except somebody
 * noticing.
 */
const TIMELINE_DATES = [
  { date: "Aug 24", label: "Applications open", on: "2026-08-24T00:00:00-07:00" },
  { date: "Sep 18", label: "Priority deadline", on: "2026-09-18T23:59:00-07:00" },
  { date: "Oct 2", label: "Applications close", on: "2026-10-02T23:59:00-07:00" },
  { date: "Oct 9", label: "Decisions released", on: "2026-10-09T00:00:00-07:00" },
  { date: "Oct 23–25", label: EVENT.name, on: "2026-10-23T00:00:00-07:00" },
] as const;

export type TimelineEntry = { date: string; label: string; done: boolean };

export function timelineAt(now: Date): TimelineEntry[] {
  return TIMELINE_DATES.map(({ date, label, on }) => ({
    date,
    label,
    done: new Date(on).getTime() <= now.getTime(),
  }));
}

/** Whole days between now and the deadline; never negative. */
export function daysUntilDeadline(now: Date = new Date()): number {
  const millis = EVENT.applicationsClose.getTime() - now.getTime();
  return Math.max(0, Math.ceil(millis / 86_400_000));
}

/**
 * Every timestamp in this portal is shown on the event's clock.
 *
 * Leaving the zone unset takes the runtime's, and the runtime differs by
 * where the component renders. Server components format on Vercel, which is
 * UTC; client components format in the reader's browser. The same submission
 * was therefore appearing as 13:48 in the applications table and 8:48 PM on
 * its own detail page, and a review written a moment ago sat next to a
 * reading aid stamped seven hours later.
 *
 * Pinning one zone fixes that, and Pacific is the right one rather than the
 * reader's own: every deadline in the product is quoted in Pacific, so a
 * reviewer in New York comparing a timestamp against "October 2, 11:59 PM PT"
 * should be reading the same clock the deadline is on.
 */
export const EVENT_TIME_ZONE = "America/Los_Angeles";

/** Formats a timestamp on the event's clock. Options are the Intl ones. */
export function inEventZone(
  value: string | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleString("en-US", { ...options, timeZone: EVENT_TIME_ZONE });
}
