import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth";
import { buildApplicationQuery, parseFilters, PAGE_SIZE } from "@/lib/applications/query";
import { toSummaries } from "@/lib/applications/summary";
import { ApplicationFilters } from "@/components/organizer/application-filters";
import { ApplicationsTable } from "@/components/organizer/applications-table";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/organizer/applications">) {
  const profile = await requireOrganizer();
  const filters = parseFilters(await searchParams);

  const supabase = await createClient();

  const [{ data, count }, { data: schoolRows }] = await Promise.all([
    buildApplicationQuery(supabase, filters),
    // Distinct schools for the filter dropdown. PostgREST has no DISTINCT,
    // so this pulls the column and dedupes here. Fine at this size; past a
    // few thousand applicants it should become its own view.
    supabase.from("profiles").select("school"),
  ]);

  const rows = toSummaries(data);
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const schools = [
    ...new Set((schoolRows ?? []).map((row) => row.school).filter((school): school is string => Boolean(school))),
  ].sort();

  return (
    <div>
      <ApplicationFilters schools={schools} showing={rows.length} total={total} />
      <ApplicationsTable rows={rows} isDirector={profile.staff_role === "director"} />

      {pageCount > 1 && (
        <Pagination page={filters.page} pageCount={pageCount} total={total} params={await searchParams} />
      )}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  params: Record<string, string | string[] | undefined>;
}) {
  function href(target: number) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== "page") next.set(key, value);
    }
    next.set("page", String(target));
    return `/organizer/applications?${next.toString()}`;
  }

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  // Shows the ends and a window around the current page, so a long list does
  // not render three hundred numbered links.
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-8"
    >
      <span className="font-mono text-[12px] text-muted">
        Rows {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
      </span>

      <div className="flex gap-1.5 font-mono text-[12px]">
        {pages.map((value, index) => (
          <span key={value} className="flex gap-1.5">
            {index > 0 && value > pages[index - 1] + 1 && (
              <span className="rounded-pill border border-line px-2.5 py-1 text-faint">…</span>
            )}
            <Link
              href={href(value)}
              aria-current={value === page ? "page" : undefined}
              className={cn(
                "rounded-pill border px-2.5 py-1 transition-colors",
                value === page
                  ? "border-berkeley bg-berkeley text-white"
                  : "border-line hover:bg-sunken",
              )}
            >
              {value}
            </Link>
          </span>
        ))}
      </div>
    </nav>
  );
}
