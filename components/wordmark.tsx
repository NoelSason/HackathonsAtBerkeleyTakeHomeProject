import { cn } from "@/lib/cn";

/**
 * The portal's mark: a Berkeley Blue tile cut by a California Gold
 * diagonal. Drawn inline as SVG rather than shipped as an image file so
 * it stays sharp at any size and needs no extra network request.
 */
export function Wordmark({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-berkeley" />
        <path d="M9 22.5 20 9.5h4L13 22.5z" className="fill-gold" />
        <circle cx="22.5" cy="21" r="2.5" className="fill-gold" />
      </svg>
      {showText && (
        <span className="text-[15px] leading-none font-bold tracking-tight text-ink">
          Cal Hacks
          <span className="ml-1.5 font-medium text-muted">Portal</span>
        </span>
      )}
    </span>
  );
}
