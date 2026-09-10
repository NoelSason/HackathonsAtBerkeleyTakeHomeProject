import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { buildApplicationQuery, parseFilters } from "@/lib/applications/query";
import { toSummaries } from "@/lib/applications/summary";
import { APPLICATION_FORMS } from "@/lib/applications/forms";
import { ROLE_COPY } from "@/lib/applications/roles";
import { statusLabel } from "@/components/ui/badge";

/**
 * Escapes one CSV cell.
 *
 * Quoting anything containing a comma, a quote or a newline is the format's
 * own requirement. The leading apostrophe on a cell starting with =, +, - or
 * @ is the less obvious one: spreadsheets treat those as formulas, so an
 * applicant who types `=1+1` into an essay would otherwise have it executed
 * when an organizer opens the file.
 */
function cell(value: string | number | null): string {
  if (value === null) return "";

  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;

  return text;
}

export async function GET(request: Request) {
  // Route handlers sit outside the organizer layout, so the check that the
  // layout would have done has to happen here too.
  const profile = await getProfile();
  if (!profile || profile.staff_role === null) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams));

  const supabase = await createClient();
  // No pagination: an export of the visible page rather than the whole
  // filtered set is almost never what somebody wanted.
  const { data } = await buildApplicationQuery(supabase, filters, { paginate: false });
  const rows = toSummaries(data);

  const header = [
    "id", "name", "email", "school", "role", "status",
    "raw_score", "calibrated_score", "reviews", "reviews_required", "submitted_at",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        cell(row.displayId),
        cell(row.fullName),
        cell(row.email),
        cell(row.school),
        cell(ROLE_COPY[row.role].label),
        cell(statusLabel(row.status)),
        cell(row.meanScore),
        cell(row.meanZScore),
        cell(row.reviewCount),
        cell(APPLICATION_FORMS[row.role].reviewsRequired),
        cell(row.submittedAt),
      ].join(","),
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calhacks-applications-${stamp}.csv"`,
    },
  });
}
