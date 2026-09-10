import type { SupabaseClient } from "@supabase/supabase-js";
import { isApplicationRole, type ApplicationRole } from "./roles.ts";
import { SUMMARY_COLUMNS } from "./summary.ts";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["application_status"];

const STATUSES: readonly string[] = [
  "draft",
  "submitted",
  "under_review",
  "accepted",
  "waitlisted",
  "rejected",
];

const SORT_COLUMNS = {
  score: "mean_score",
  calibrated: "mean_z_score",
  submitted: "submitted_at",
  name: "full_name",
} as const;

export const PAGE_SIZE = 25;

export type ListFilters = {
  q: string;
  role: ApplicationRole | null;
  status: Status | null;
  school: string | null;
  sort: keyof typeof SORT_COLUMNS;
  direction: "asc" | "desc";
  page: number;
};

function first(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw.trim() : null;
}

/**
 * Turns raw query-string values into filters that are safe to use.
 *
 * Everything here arrives from the URL, so nothing is trusted: role and
 * status are checked against their enums, sort against a fixed map, and the
 * page number is clamped. An unrecognised value falls back to the default
 * rather than reaching Postgres.
 */
export function parseFilters(params: Record<string, string | string[] | undefined>): ListFilters {
  const role = first(params.role);
  const status = first(params.status);
  const sort = first(params.sort);
  const page = Number(first(params.page) ?? "1");

  return {
    // Commas and parentheses are structural in a PostgREST `or` expression,
    // so a search for "Wu, Jordan" would otherwise be read as two filters.
    // Stripping them is enough here because everything else is escaped by
    // the client library.
    q: (first(params.q) ?? "").replace(/[(),*]/g, ""),
    role: role && isApplicationRole(role) ? role : null,
    status: status && STATUSES.includes(status) ? (status as Status) : null,
    school: first(params.school),
    sort: sort && sort in SORT_COLUMNS ? (sort as keyof typeof SORT_COLUMNS) : "calibrated",
    direction: first(params.dir) === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

/**
 * Builds the filtered, sorted, paginated query over application_summary.
 *
 * Shared by the table and the CSV export so that what somebody downloads is
 * exactly what they were looking at. The export skips the range so it covers
 * the whole filtered set rather than the visible page.
 */
export function buildApplicationQuery(
  supabase: SupabaseClient<Database>,
  filters: ListFilters,
  { paginate = true }: { paginate?: boolean } = {},
) {
  let query = supabase
    .from("application_summary")
    .select(SUMMARY_COLUMNS, { count: "exact" });

  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.school) query = query.eq("school", filters.school);

  if (filters.q) {
    // A bare number is almost always somebody pasting an application id.
    if (/^\d+$/.test(filters.q)) {
      query = query.eq("display_id", Number(filters.q));
    } else {
      query = query.or(`full_name.ilike.%${filters.q}%,school.ilike.%${filters.q}%`);
    }
  }

  query = query.order(SORT_COLUMNS[filters.sort], {
    ascending: filters.direction === "asc",
    // Unreviewed applications have no score. They belong at the bottom of a
    // ranking either way, not floating above everything on a descending sort.
    nullsFirst: false,
  });

  // A stable tiebreak, so two applications with the same score do not swap
  // places between page loads and appear twice or not at all while paging.
  query = query.order("display_id", { ascending: true });

  if (paginate) {
    const from = (filters.page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);
  }

  return query;
}
