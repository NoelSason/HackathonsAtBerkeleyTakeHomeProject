import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { buttonStyles } from "@/components/ui/button";

/*
 * Next ships a default 404, and it is a black page in a system font.
 *
 * That matters more than it sounds: the app declares `color-scheme: light`
 * and every other screen is on the light ground, so mistyping a URL looked
 * like landing on a different product entirely. This one is the same page
 * furniture as everything else, and it offers the two routes back that a
 * lost visitor actually wants.
 */
export default function NotFound() {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-18 max-w-360 items-center px-6 sm:px-16">
          <Wordmark qualifier="PORTAL" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-360 flex-1 items-center px-6 py-24 sm:px-16">
        <div>
          <p className="font-mono text-[13px] tracking-[0.06em] text-gold-deep">404</p>

          <h1 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-[-0.02em] text-balance sm:text-5xl">
            That page is not here.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            The link may be out of date, or the application it pointed at may have
            been withdrawn.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/" className={buttonStyles("primary")}>
              Back to the start
            </Link>
            <Link href="/dashboard" className={buttonStyles("secondary")}>
              My applications
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
