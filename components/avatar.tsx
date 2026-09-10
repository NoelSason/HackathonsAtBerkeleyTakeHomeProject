import { cn } from "@/lib/cn";

/**
 * Initials in a circle. No photo upload anywhere in the portal, so there is
 * no image to fall back from — this is the only avatar there is.
 */
export function Avatar({
  children,
  tone = "light",
  className,
}: {
  children: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        tone === "dark"
          ? "h-6 w-6 bg-gold text-[11px] text-berkeley-deep"
          : "h-[26px] w-[26px] bg-berkeley-soft text-[12px] text-berkeley",
        className,
      )}
    >
      {children}
    </span>
  );
}
