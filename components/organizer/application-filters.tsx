"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { APPLICATION_ROLES, ROLE_COPY } from "@/lib/applications/roles";
import { statusLabel } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/database.types";

const STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "accepted",
  "waitlisted",
  "rejected",
] as const satisfies readonly Database["public"]["Enums"]["application_status"][];

/**
 * Search and filter controls for the applications table.
 *
 * Every choice is written into the URL rather than into component state, so
 * a filtered view is a link. Organizers work in pairs on a shortlist and
 * routinely paste "the under-review mentors from Waterloo" at each other;
 * that only works if the address bar holds the whole query.
 */
export function ApplicationFilters({
  schools,
  showing,
  total,
}: {
  schools: string[];
  showing: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("q") ?? "");

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }

    // Any change to the filters invalidates the current page number.
    next.delete("page");

    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  // Typing should not fire a query per keystroke, and it should not need a
  // button either. This waits until the applicant stops for a moment.
  useEffect(() => {
    if (search === (params.get("q") ?? "")) return;

    const timer = setTimeout(() => apply({ q: search }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const role = params.get("role");
  const status = params.get("status");
  const school = params.get("school");

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-4 sm:px-8">
      <label className="relative">
        <span className="sr-only">Search applications</span>
        <span aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-faint">
          ⌕
        </span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, school, id…"
          className="w-65 rounded-control border border-line bg-sunken py-2 pr-3 pl-8 text-sm placeholder:text-faint focus:border-berkeley"
        />
      </label>

      <FilterSelect
        label="Role"
        value={role}
        onChange={(value) => apply({ role: value })}
        options={APPLICATION_ROLES.map((item) => ({ value: item, label: ROLE_COPY[item].label }))}
      />

      <FilterSelect
        label="Status"
        value={status}
        onChange={(value) => apply({ status: value })}
        options={STATUSES.map((item) => ({ value: item, label: statusLabel(item) }))}
      />

      <FilterSelect
        label="School"
        value={school}
        onChange={(value) => apply({ school: value })}
        options={schools.map((item) => ({ value: item, label: item }))}
      />

      <div className="flex-1" />

      <span className={cn("font-mono text-[12px] text-muted", isPending && "opacity-50")}>
        {showing.toLocaleString()} of {total.toLocaleString()}
      </span>

      <a
        href={`/organizer/applications/export?${params.toString()}`}
        className="rounded-control border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-berkeley transition-colors hover:bg-sunken"
      >
        Export CSV
      </a>
    </div>
  );
}

/**
 * A select that looks like a chip once something is chosen.
 *
 * The active state has to be visible from across the room, because the most
 * expensive mistake on this page is reading a filtered count as if it were
 * the whole pile.
 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  const active = value !== null;

  return (
    <label
      className={cn(
        "relative flex items-center gap-1.5 rounded-control border px-3 py-2 text-[13px] font-semibold transition-colors",
        active ? "border-berkeley bg-berkeley-soft text-berkeley" : "border-line-strong text-ink",
      )}
    >
      <span className={active ? "sr-only" : undefined}>{label}</span>
      {active && (
        <span>
          {label}: {options.find((option) => option.value === value)?.label ?? value}
        </span>
      )}

      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <span aria-hidden className={active ? "text-berkeley" : "text-faint"}>
        {active ? "✕" : "▾"}
      </span>
    </label>
  );
}
