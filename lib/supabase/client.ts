import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/*
 * The browser client. Used only where the page genuinely needs to react to
 * the database while it is open — autosaving a draft, and the live status
 * timeline. Everything else reads through the server client, which keeps the
 * data out of the client bundle.
 *
 * Shipping the anon key to the browser is the intended design. It identifies
 * the project, not the user; row-level security is what decides which rows
 * come back.
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
