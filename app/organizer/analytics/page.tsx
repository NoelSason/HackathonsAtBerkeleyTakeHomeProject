import type { Metadata } from "next";
import { requireOrganizer } from "@/lib/auth";
import { fetchAnalytics, type Analytics } from "@/lib/applications/analytics";
import { APPLICATION_FORMS } from "@/lib/applications/forms";
import { ROLE_COPY, isApplicationRole } from "@/lib/applications/roles";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireOrganizer();
  const data = await fetchAnalytics();

  if (!data) {
    return <p className="px-8 py-16 text-center text-sm text-muted">Could not load analytics.</p>;
  }

  const { totals, reviews } = data;
  const submittedShare = totals.all > 0 ? Math.round((totals.submitted / totals.all) * 100) : 0;

  // Completion is measured against submitted applications only. Counting
  // drafts would make the number drift down every time somebody starts a
  // form and wanders off, which is not a reviewing problem.
  const complete = data.by_role.reduce((sum, row) => sum + row.complete, 0);
  const completionShare =
    totals.submitted > 0 ? Math.round((complete / totals.submitted) * 100) : 0;

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[22px] font-extrabold tracking-tight">Applications overview</h1>
        <p className="font-mono text-[12px] text-muted">
          UPDATED {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total applications" value={totals.all.toLocaleString()}>
          <span className="text-muted">{totals.drafts} still in draft</span>
        </Stat>
        <Stat label="Submitted" value={totals.submitted.toLocaleString()}>
          <span className="text-muted">{submittedShare}% of total</span>
        </Stat>
        <Stat label="Fully read" value={complete.toLocaleString()}>
          <span className="text-muted">{completionShare}% of submitted</span>
        </Stat>
        <Stat label="Median score" value={reviews.median.toFixed(1)}>
          <span className="text-muted">
            σ {reviews.stddev.toFixed(1)} across {reviews.reviewers} reviewers
          </span>
        </Stat>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Submissions by week" note="SUBMISSIONS / WK">
          <WeeklyVolume weeks={data.by_week} />
        </Panel>

        <Panel title="By role">
          <RoleBreakdown rows={data.by_role} total={totals.all} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Top schools">
          <SchoolBars rows={data.by_school} />
        </Panel>

        <Panel title="Score distribution">
          <ScoreDistribution rows={data.score_distribution} total={reviews.written} />
        </Panel>

        <Panel title="Review completion" note={`${completionShare}%`}>
          <ReviewCompletion rows={data.by_role} share={completionShare} />
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-control border border-line bg-surface px-5 py-4.5">
      <p className="text-[12px] text-faint">{label}</p>
      <p className="mt-1.5 font-mono text-[28px] leading-none font-semibold">{value}</p>
      <p className="mt-2 text-[12px]">{children}</p>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-control border border-line bg-surface px-6 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {note && <span className="font-mono text-[11px] text-faint">{note}</span>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/*
 * Bars are scaled against the largest value in their own series rather than
 * against a fixed maximum, so the shape stays readable whether the tallest
 * week is nine applications or nine thousand.
 */
function WeeklyVolume({ weeks }: { weeks: Analytics["by_week"] }) {
  const peak = Math.max(1, ...weeks.map((week) => week.total));

  return (
    <div>
      <div className="flex h-40 items-end gap-2.5">
        {weeks.map((week) => (
          <div key={week.week} className="flex h-full flex-1 flex-col justify-end">
            <span className="mb-1 text-center font-mono text-[11px] text-faint">{week.total}</span>
            <div
              className={cn(
                "rounded-t-[2px]",
                week.total === peak ? "bg-berkeley" : week.total > peak / 2 ? "bg-steel-deep" : "bg-steel",
              )}
              style={{ height: `${Math.max(4, (week.total / peak) * 100)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2.5 font-mono text-[11px] text-faint">
        {weeks.map((week) => (
          <span key={week.week} className="flex-1 text-center">
            {new Date(week.week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoleBreakdown({ rows, total }: { rows: Analytics["by_role"]; total: number }) {
  return (
    <div>
      <ul className="space-y-3.5">
        {rows.map((row) => {
          const label = isApplicationRole(row.role) ? ROLE_COPY[row.role].label : row.role;
          const share = total > 0 ? (row.total / total) * 100 : 0;

          return (
            <li key={row.role}>
              <div className="flex justify-between text-[13px]">
                <span className="font-semibold">{label}</span>
                <span className="font-mono text-muted">{row.total.toLocaleString()}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-sunken">
                <div className="h-1.5 rounded-full bg-berkeley" style={{ width: `${share}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4.5 flex justify-between border-t border-line pt-3.5 text-[13px]">
        <span className="text-muted">Total</span>
        <span className="font-mono font-semibold">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

function SchoolBars({ rows }: { rows: Analytics["by_school"] }) {
  const peak = Math.max(1, ...rows.map((row) => row.total));

  return (
    <ul className="space-y-2.5 text-[13px]">
      {rows.map((row) => (
        <li key={row.school} className="flex items-center gap-2.5">
          <span className="w-32 shrink-0 truncate text-muted">{row.school}</span>
          <span className="h-1.5 flex-1 bg-sunken">
            <span
              className="block h-1.5 bg-berkeley"
              style={{ width: `${(row.total / peak) * 100}%` }}
            />
          </span>
          <span className="w-9 shrink-0 text-right font-mono">{row.total}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreDistribution({
  rows,
  total,
}: {
  rows: Analytics["score_distribution"];
  total: number;
}) {
  const peak = Math.max(1, ...rows.map((row) => row.total));

  return (
    <div>
      <div className="flex h-36 items-end gap-3.5 px-2">
        {rows.map((row) => {
          const share = total > 0 ? Math.round((row.total / total) * 100) : 0;
          return (
            <div key={row.score} className="flex h-full flex-1 flex-col justify-end">
              <span className="mb-1 text-center font-mono text-[11px] text-faint">{share}%</span>
              <div
                className={cn(
                  "rounded-t-[2px]",
                  row.total === peak ? "bg-berkeley" : row.total > peak / 2 ? "bg-steel-deep" : "bg-steel",
                )}
                style={{ height: `${Math.max(2, (row.total / peak) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-3.5 px-2 font-mono text-[11px] text-faint">
        {rows.map((row) => (
          <span key={row.score} className="flex-1 text-center">
            {row.score}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReviewCompletion({ rows, share }: { rows: Analytics["by_role"]; share: number }) {
  return (
    <div>
      <div className="h-2 rounded-full bg-sunken">
        <div className="h-2 rounded-full bg-positive" style={{ width: `${share}%` }} />
      </div>

      <ul className="mt-5 space-y-3 text-[13px]">
        {rows.map((row) => {
          const label = isApplicationRole(row.role) ? ROLE_COPY[row.role].label : row.role;
          const target = isApplicationRole(row.role)
            ? APPLICATION_FORMS[row.role].reviewsRequired
            : 0;
          const percent = row.submitted > 0 ? Math.round((row.complete / row.submitted) * 100) : 0;

          return (
            <li key={row.role} className="flex justify-between gap-3">
              <span className="text-muted">
                {label} · {target} {target === 1 ? "read" : "reads"} each
              </span>
              <span className="font-mono">{percent}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
