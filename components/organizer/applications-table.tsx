"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { decideApplications } from "@/app/organizer/actions";
import { APPLICATION_FORMS } from "@/lib/applications/forms";
import { ROLE_COPY } from "@/lib/applications/roles";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { ApplicationSummary } from "@/lib/applications/summary";

const GRID =
  "grid grid-cols-[2.75rem_1.4fr_1.2fr_5.5rem_9.5rem_5rem_6rem_5rem_8rem] items-center gap-2";

const SORTS = {
  score: "Sort by raw score",
  calibrated: "Sort by calibrated score",
  submitted: "Sort by submission time",
  name: "Sort by name",
} as const;

export function ApplicationsTable({
  rows,
  isDirector,
}: {
  rows: ApplicationSummary[];
  isDirector: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const sort = params.get("sort") ?? "calibrated";
  const direction = params.get("dir") === "asc" ? "asc" : "desc";

  function sortHref(column: keyof typeof SORTS) {
    const next = new URLSearchParams(params.toString());
    next.set("sort", column);
    // Clicking the column you are already sorted by flips the direction.
    next.set("dir", sort === column && direction === "desc" ? "asc" : "desc");
    next.delete("page");
    return `${pathname}?${next.toString()}`;
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function decide(status: "accepted" | "waitlisted" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await decideApplications({
        applicationIds: [...selected],
        status,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-4 border-b border-line bg-berkeley-soft px-4 py-2.5 text-[13px] sm:px-8">
          <span className="font-bold text-berkeley">{selected.size} selected</span>

          {isDirector ? (
            <div className="flex flex-wrap gap-2">
              <BulkButton tone="positive" disabled={isPending} onClick={() => decide("accepted")}>
                ✓ Accept
              </BulkButton>
              <BulkButton tone="warning" disabled={isPending} onClick={() => decide("waitlisted")}>
                ⋯ Waitlist
              </BulkButton>
              <BulkButton tone="danger" disabled={isPending} onClick={() => decide("rejected")}>
                ✕ Reject
              </BulkButton>
            </div>
          ) : (
            // Reviewers see why the controls are missing rather than a gap.
            // The database would refuse them anyway; this explains it.
            <span className="text-muted">Decisions are made by directors.</span>
          )}

          {error && <span className="font-medium text-danger">{error}</span>}

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-muted transition-colors hover:text-ink"
          >
            Clear selection
          </button>
        </div>
      )}

      <div
        className={cn(
          GRID,
          "border-b border-line-strong bg-sunken px-4 py-2.5 font-mono text-[11px] tracking-[0.06em] text-muted sm:px-8",
        )}
      >
        <div>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
            aria-label="Select all on this page"
            className="h-3.5 w-3.5 accent-berkeley"
          />
        </div>
        <div>APPLICANT</div>
        <div>SCHOOL</div>
        <div>ROLE</div>
        <div>STATUS</div>
        <SortHeader column="score" current={sort} direction={direction} href={sortHref("score")}>
          SCORE
        </SortHeader>
        <SortHeader column="calibrated" current={sort} direction={direction} href={sortHref("calibrated")}>
          CAL.
        </SortHeader>
        <div className="text-right">READS</div>
        <SortHeader column="submitted" current={sort} direction={direction} href={sortHref("submitted")}>
          SUBMITTED
        </SortHeader>
      </div>

      <ul>
        {rows.map((row) => {
          const isSelected = selected.has(row.id);
          const required = APPLICATION_FORMS[row.role].reviewsRequired;

          return (
            <li
              key={row.id}
              className={cn(
                GRID,
                "border-b border-line px-4 py-2.5 text-sm transition-colors sm:px-8",
                isSelected ? "bg-berkeley-soft" : "hover:bg-sunken",
              )}
            >
              <div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(row.id)}
                  aria-label={`Select ${row.fullName}`}
                  className="h-3.5 w-3.5 accent-berkeley"
                />
              </div>

              <div className="truncate">
                <Link
                  href={`/organizer/applications/${row.id}`}
                  className="font-semibold hover:underline"
                >
                  {row.fullName}
                </Link>
                <span className="ml-2 font-mono text-[11px] text-faint">{row.displayId}</span>
              </div>

              <div className="truncate text-muted">{row.school ?? "—"}</div>
              <div className="text-muted">{ROLE_COPY[row.role].label}</div>
              <div>
                <StatusBadge status={row.status} />
              </div>

              <div className="text-right font-mono font-semibold">
                {row.meanScore === null ? <span className="text-faint">—</span> : row.meanScore.toFixed(1)}
              </div>

              {/* The calibrated figure is a z-score, so the sign carries the
                  meaning: positive is above the reviewers' own averages. */}
              <div
                className={cn(
                  "text-right font-mono",
                  row.meanZScore === null
                    ? "text-faint"
                    : row.meanZScore > 0
                      ? "text-positive"
                      : "text-muted",
                )}
              >
                {row.meanZScore === null
                  ? "—"
                  : `${row.meanZScore > 0 ? "+" : ""}${row.meanZScore.toFixed(2)}`}
              </div>

              <div className="text-right font-mono text-muted">
                {row.reviewCount}/{required}
              </div>

              <div className="text-right font-mono text-[12px] text-faint">
                {row.submittedAt
                  ? new Date(row.submittedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "—"}
              </div>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="px-8 py-16 text-center text-sm text-muted">
          No applications match these filters.
        </p>
      )}
    </div>
  );
}

function SortHeader({
  column,
  current,
  direction,
  href,
  children,
}: {
  column: keyof typeof SORTS;
  current: string;
  direction: "asc" | "desc";
  href: string;
  children: string;
}) {
  const active = current === column;

  return (
    <Link
      href={href}
      title={SORTS[column]}
      className={cn(
        "text-right transition-colors hover:text-ink",
        active && "font-semibold text-ink",
      )}
    >
      {children}
      {active && <span aria-hidden> {direction === "desc" ? "↓" : "↑"}</span>}
    </Link>
  );
}

function BulkButton({
  tone,
  children,
  disabled,
  onClick,
}: {
  tone: "positive" | "warning" | "danger";
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const tones = {
    positive: "border-positive text-positive hover:bg-positive hover:text-white",
    warning: "border-warning text-warning hover:bg-warning hover:text-white",
    danger: "border-danger text-danger hover:bg-danger hover:text-white",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-pill border bg-surface px-3 py-1.5 font-semibold transition-colors disabled:opacity-50",
        tones[tone],
      )}
    >
      {children}
    </button>
  );
}
