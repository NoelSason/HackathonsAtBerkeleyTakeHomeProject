import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { buttonStyles } from "@/components/ui/button";
import { APPLICATION_ROLES, ROLE_COPY } from "@/lib/applications/roles";
import { EVENT, timelineAt } from "@/lib/event";
import { cn } from "@/lib/cn";

// Whether a milestone has passed is read from the clock, so the page is
// cached for an hour rather than baked in at build time.
export const revalidate = 3600;

export default function LandingPage() {
  const timeline = timelineAt(new Date());

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-18 max-w-360 items-center justify-between px-6 sm:px-16">
          <Wordmark qualifier="12.0" />

          <nav className="flex items-center gap-3">
            <Link href="/sign-in" className={buttonStyles("ghost", "sm")}>
              Sign in
            </Link>
            <Link href="/apply" className={buttonStyles("primary", "sm")}>
              Apply
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-360 flex-1">
        <section className="px-6 pt-20 pb-20 sm:px-16 sm:pt-28 sm:pb-24">
          <p className="font-mono text-[13px] tracking-[0.06em] text-gold-deep">
            OCTOBER 23–25, 2026 · UC BERKELEY
          </p>

          <h1 className="mt-6 max-w-4xl text-4xl leading-[1.04] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl lg:text-[76px] lg:leading-[1.02]">
            Three days to build something that matters.
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Cal Hacks brings nine hundred students to Berkeley for the largest collegiate hackathon
            in the world. Hardware, teams, mentors, and thirty-six hours on the clock.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link href="/apply" className={buttonStyles("primary", "md", "h-12 px-8 text-base")}>
              Apply now
            </Link>
            <p className="text-sm text-muted">
              Applications close{" "}
              <span className="font-semibold text-ink">{EVENT.decisionsLabel === "October 9" ? "October 2" : ""}</span>
            </p>
          </div>
        </section>

        <section className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {APPLICATION_ROLES.map((role, index) => (
            <Link
              key={role}
              href={`/apply/${role}`}
              className={cn(
                "group border-line px-6 py-10 transition-colors hover:bg-sunken sm:px-10",
                index < APPLICATION_ROLES.length - 1 && "lg:border-r",
                index % 2 === 0 && "sm:border-r lg:border-r",
                index < 2 && "border-b sm:border-b lg:border-b-0",
                index === 0 && "sm:pl-6 lg:pl-16",
                index === APPLICATION_ROLES.length - 1 && "lg:pr-16",
              )}
            >
              <p className="font-mono text-[11px] tracking-[0.08em] text-faint">
                {String(index + 1).padStart(2, "0")}
              </p>

              <h2 className="mt-3 text-xl font-bold tracking-tight">{ROLE_COPY[role].label}</h2>

              <p className="mt-2 text-sm leading-relaxed text-muted">{ROLE_COPY[role].blurb}</p>

              <p className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-berkeley">
                Apply as a {ROLE_COPY[role].label.toLowerCase()}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </p>
            </Link>
          ))}
        </section>

        <section className="border-t border-line px-6 py-14 sm:px-16 sm:py-16">
          <h2 className="text-[22px] font-bold tracking-tight">Key dates</h2>

          <ol className="mt-9 grid gap-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {timeline.map((item) => (
              <li key={item.label} className="relative lg:pt-4">
                {/* The rule only reads as a timeline when the items sit in one
                    row, so it is drawn at the wide breakpoint only. */}
                <span aria-hidden className="absolute top-0 left-0 hidden h-px w-full bg-line-strong lg:block" />
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 left-0 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full outline outline-line-strong lg:block",
                    item.done ? "bg-gold" : "bg-ground",
                  )}
                />
                <p className="font-mono text-[12px] tracking-wide text-muted">
                  {item.date.toUpperCase()}
                </p>
                <p className="mt-1 text-sm font-semibold">{item.label}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line bg-sunken">
        <div className="mx-auto flex max-w-360 flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-16">
          <span className="flex items-center gap-2.5">
            <span aria-hidden className="h-3.5 w-3.5 rounded-[2px] bg-gold" />
            <span className="text-[13px] text-muted">
              Hackathons at Berkeley · UC Berkeley
            </span>
          </span>

          <p className="text-[13px] text-faint">
            Decisions release {EVENT.decisionsLabel}.
          </p>
        </div>
      </footer>
    </>
  );
}
