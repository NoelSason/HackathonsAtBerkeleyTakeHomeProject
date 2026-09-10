"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/organizer/applications", label: "Applications" },
  { href: "/organizer/review", label: "Review queue" },
  { href: "/organizer/analytics", label: "Analytics" },
] as const;

/**
 * The only client component in the organizer chrome.
 *
 * Highlighting the current section needs the pathname, and reading it here
 * costs less than threading a "current section" prop through every organizer
 * page. `startsWith` rather than equality so an application detail page keeps
 * Applications lit.
 */
export function OrganizerNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 text-[13px]">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-pill px-3 py-1.5 transition-colors",
              active ? "bg-white/12 font-semibold text-white" : "text-steel hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
