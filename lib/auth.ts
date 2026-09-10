import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * The signed-in user's profile, or null.
 *
 * Wrapped in React's `cache` so that a layout, its page and any component
 * beneath them all share one round trip. Without it a single organizer page
 * render would ask Supabase who the user is four or five times.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  // getUser() verifies the token with Supabase. getSession() only decodes the
  // cookie, which is client-writable, so it must never gate access.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
});

/** For pages any signed-in person may open. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/sign-in");
  return profile;
}

/**
 * For the organizer area.
 *
 * This is a second gate, not the only one. Row-level security already stops a
 * plain applicant reading anyone else's application, so bypassing this check
 * would show them an empty table rather than other people's data. It exists
 * so they get sent somewhere sensible instead of a page of blanks.
 */
export async function requireOrganizer(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.staff_role === null) redirect("/dashboard");
  return profile;
}

/** For the accept, waitlist and reject controls. */
export async function requireDirector(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.staff_role !== "director") redirect("/organizer/applications");
  return profile;
}

/** "Priya Raman" becomes PR; an address falls back to its first two letters. */
export function initials(profile: Pick<Profile, "full_name" | "email">): string {
  const fromName = profile.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (fromName || profile.email.slice(0, 2)).toUpperCase();
}
