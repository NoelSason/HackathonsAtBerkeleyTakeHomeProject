import type { Database } from "@/lib/database.types";
import type { ApplicationRole } from "./roles";

type Row = Database["public"]["Views"]["application_summary"]["Row"];
type Status = Database["public"]["Enums"]["application_status"];

/** The columns to request. Named once so every organizer query agrees. */
export const SUMMARY_COLUMNS =
  "id, display_id, user_id, role, status, responses, submitted_at, full_name, email, school, review_count, mean_score, mean_z_score";

/**
 * Exactly the columns SUMMARY_COLUMNS asks for.
 *
 * Supabase infers the row type from the select string, so a query that skips
 * created_at returns something narrower than the view's full row. Pinning
 * this to a Pick keeps the two definitions honest: drop a column from the
 * string above without dropping it here and the build says so.
 */
type SummarySource = Pick<
  Row,
  | "id"
  | "display_id"
  | "user_id"
  | "role"
  | "status"
  | "responses"
  | "submitted_at"
  | "full_name"
  | "email"
  | "school"
  | "review_count"
  | "mean_score"
  | "mean_z_score"
>;

export type ApplicationSummary = {
  id: string;
  displayId: number;
  userId: string;
  role: ApplicationRole;
  status: Status;
  responses: Record<string, unknown>;
  submittedAt: string | null;
  fullName: string;
  email: string;
  school: string | null;
  reviewCount: number;
  meanScore: number | null;
  meanZScore: number | null;
};

/**
 * Converts a raw view row into the shape the organizer pages actually use.
 *
 * Postgres reports every column of a view as nullable, because it cannot
 * prove that the inner join on `profiles` guarantees a name and an email.
 * The generated types reflect that honestly, which would otherwise leave
 * `?? ""` scattered through every table cell.
 *
 * Rather than assert the nulls away with a cast, this narrows once and
 * returns null for a row that genuinely is malformed, so a bad row is
 * dropped rather than rendered as a line of blanks.
 */
export function toSummary(row: SummarySource): ApplicationSummary | null {
  const { id, display_id, user_id, role, status, full_name, email } = row;

  if (
    id === null ||
    display_id === null ||
    user_id === null ||
    role === null ||
    status === null ||
    full_name === null ||
    email === null
  ) {
    return null;
  }

  return {
    id,
    displayId: display_id,
    userId: user_id,
    role,
    status,
    responses: (row.responses ?? {}) as Record<string, unknown>,
    submittedAt: row.submitted_at,
    fullName: full_name,
    email,
    school: row.school,
    reviewCount: row.review_count ?? 0,
    meanScore: row.mean_score,
    meanZScore: row.mean_z_score,
  };
}

/** Maps a page of rows, dropping any that failed to narrow. */
export function toSummaries(rows: SummarySource[] | null): ApplicationSummary[] {
  return (rows ?? [])
    .map(toSummary)
    .filter((row): row is ApplicationSummary => row !== null);
}
