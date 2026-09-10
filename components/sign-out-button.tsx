import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/cn";

/**
 * A real form posting to a server action, not a fetch from a click handler.
 * That keeps sign-out working before hydration and without JavaScript, and
 * means the session cookie is cleared by the server rather than the browser.
 */
export function SignOutButton({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={cn(
          "text-[13px] transition-colors",
          tone === "dark" ? "text-steel hover:text-white" : "text-muted hover:text-ink",
        )}
      >
        Sign out
      </button>
    </form>
  );
}
