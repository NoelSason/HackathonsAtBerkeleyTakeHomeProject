import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types.ts";

/**
 * Signs the command-line tools in as a real organizer.
 *
 * This is the decision the whole portal surface rests on, so it is worth
 * stating plainly: **these tools authenticate as a person and every query
 * they run is subject to that person's row-level security.** They never touch
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * The service role would have been easier. It would also have meant that
 * anything holding these credentials — a shell script, an agent, a laptop
 * left unlocked — could read and write every row in the database, including
 * the applications of people who never agreed to that. Signing in as an
 * organizer means the blast radius is exactly one human's existing access.
 * A reviewer's configuration gets a reviewer's view; a director's gets a
 * director's; an applicant's gets refused at startup.
 *
 * There is a second reason, and it is the one that settles the argument. The
 * analytics query is a SECURITY INVOKER function that guards itself with
 * `is_organizer()`, which reads `auth.uid()`. A service-role connection has
 * no `auth.uid()`, so it would not merely be over-privileged here — it would
 * fail outright. The schema already refuses the shortcut.
 */

export type PortalSession = {
  supabase: SupabaseClient<Database>;
  /** Who the tools are acting as, for the footer on every answer. */
  actor: { email: string; fullName: string; staffRole: "reviewer" | "director" };
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local — see .env.example for what these two are for.`,
    );
  }
  return value;
}

/**
 * Signs in and confirms the account is staff.
 *
 * Throws rather than degrading. A tool that quietly returned an applicant's
 * two rows when asked for the whole pile would be worse than one that refuses
 * to start, because the answer would look complete.
 */
export async function openPortalSession(): Promise<PortalSession> {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const email = required("PORTAL_ORGANIZER_EMAIL");
  const password = required("PORTAL_ORGANIZER_PASSWORD");

  const supabase = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !auth.user) {
    throw new Error(`Could not sign in as ${email}: ${signInError?.message ?? "no session"}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, full_name, staff_role")
    .eq("id", auth.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(`Signed in as ${email} but could not read that profile.`);
  }

  if (profile.staff_role === null) {
    throw new Error(
      `${email} is an applicant, not an organizer. These tools read the whole applications ` +
        `pile, so they refuse to run as an account that cannot see it — an applicant session ` +
        `would return two rows and look like an answer.`,
    );
  }

  return {
    supabase,
    actor: {
      email: profile.email,
      fullName: profile.full_name,
      staffRole: profile.staff_role,
    },
  };
}

/** One line naming whose view an answer came from. */
export function attribution(actor: PortalSession["actor"]): string {
  return `Read as ${actor.fullName} <${actor.email}>, a ${actor.staffRole}. Every row above is one that account can already see in the portal.`;
}
