import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { buttonStyles } from "@/components/ui/button";
import { APPLICATION_ROLES, ROLE_COPY } from "@/lib/applications/roles";

/*
 * Key dates live here rather than in the database. They change once a
 * year, an organiser editing them would be editing a page anyway, and
 * putting them in Postgres would mean a table, a query and a cache
 * boundary to render four lines of text.
 */
const TIMELINE = [
  { date: "Sep 8", label: "Applications open", done: true },
  { date: "Oct 2", label: "Hacker applications close", done: false },
  { date: "Oct 9", label: "Decisions released", done: false },
  { date: "Oct 23", label: "Cal Hacks begins", done: false },
];

export default function LandingPage() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-ground/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Wordmark />
          <nav className="flex items-center gap-2">
            <Link href="/sign-in" className={buttonStyles("ghost", "sm")}>
              Sign in
            </Link>
            <Link href="/apply" className={buttonStyles("primary", "sm")}>
              Apply
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <section className="border-b border-line py-20 sm:py-28">
          <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">
            Fall 2026 · University of California, Berkeley
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight text-balance text-ink sm:text-6xl">
            Applications are open for Cal&nbsp;Hacks.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            A weekend in Berkeley with nine hundred other people building things. Come to
            build, or help run it as a mentor, judge or volunteer.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/apply" className={buttonStyles("primary", "md")}>
              Start an application
            </Link>
            <Link href="/sign-in" className={buttonStyles("secondary", "md")}>
              Check my status
            </Link>
          </div>

          <p className="mt-5 text-[13px] text-faint">
            Hacker applications close October 2. Everything else stays open until we fill up.
          </p>
        </section>

        <section className="border-b border-line py-16">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Four ways in</h2>
          <p className="mt-1.5 text-sm text-muted">
            Each one asks a different set of questions. You can hold more than one.
          </p>

          <ul className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {APPLICATION_ROLES.map((role, index) => {
              const copy = ROLE_COPY[role];
              return (
                <li key={role} className="group bg-surface transition-colors hover:bg-sunken">
                  <Link href={`/apply/${role}`} className="block h-full p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-xs text-faint">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-mono text-[11px] tracking-wide text-faint uppercase">
                        {copy.commitment}
                      </span>
                    </div>

                    <h3 className="mt-3 flex items-center gap-1.5 text-lg font-bold tracking-tight text-ink">
                      {copy.label}
                      <span
                        aria-hidden
                        className="translate-x-0 text-berkeley opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                      >
                        →
                      </span>
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-muted">{copy.blurb}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="py-16">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Key dates</h2>

          <ol className="mt-8 grid gap-8 sm:grid-cols-4 sm:gap-4">
            {TIMELINE.map((item) => (
              <li key={item.label} className="relative sm:pt-5">
                {/* The rule and dot only make sense as a horizontal track, so
                    on narrow screens the list falls back to plain stacked
                    rows rather than a track running off the edge. */}
                <span aria-hidden className="absolute top-0 left-0 hidden h-px w-full bg-line sm:block" />
                <span
                  aria-hidden
                  className={`absolute top-0 left-0 hidden h-2 w-2 -translate-y-1/2 rounded-full sm:block ${
                    item.done ? "bg-gold" : "bg-line-strong"
                  }`}
                />
                <p className="font-mono text-xs tracking-wide text-muted">{item.date}</p>
                <p className="mt-1 text-sm font-medium text-ink">{item.label}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <p className="text-[13px] text-faint">
            Run by Hackathons at Berkeley, a student organisation at UC Berkeley.
          </p>
        </div>
      </footer>
    </>
  );
}
