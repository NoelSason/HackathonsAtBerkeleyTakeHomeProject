import { cn } from "@/lib/cn";

/**
 * The Cal Hacks lockup: a California Gold tile, the name, and a small mono
 * qualifier. Drawn as a styled element rather than an image so it stays sharp
 * and costs no extra request.
 *
 * `tone` exists because the mark sits on two different grounds. The applicant
 * side is warm off-white; the organizer side is navy, where the name has to
 * flip to white while the gold tile stays exactly as it is.
 */
export function Wordmark({
  qualifier,
  tone = "light",
  className,
}: {
  qualifier?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn("shrink-0 rounded-[3px] bg-gold", tone === "dark" ? "h-4 w-4" : "h-[18px] w-[18px]")}
      />
      <span
        className={cn(
          "text-[15px] leading-none font-extrabold tracking-tight",
          tone === "dark" ? "text-white" : "text-ink",
        )}
      >
        Cal Hacks
      </span>
      {qualifier && (
        <span
          className={cn(
            "font-mono text-[11px] leading-none tracking-wide",
            tone === "dark" ? "text-steel" : "text-muted",
          )}
        >
          {qualifier}
        </span>
      )}
    </span>
  );
}
