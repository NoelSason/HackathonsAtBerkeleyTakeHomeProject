/**
 * Joins class names, dropping anything falsy.
 *
 * This exists so components can write `cn("base", isActive && "extra")`
 * without `false` or `undefined` ending up in the class attribute. It is
 * deliberately not `tailwind-merge`: nothing in this codebase passes
 * conflicting utilities to the same element, so the extra dependency and
 * its runtime parsing cost would buy nothing.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
