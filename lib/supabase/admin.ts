import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * A client authenticated with the service role key.
 *
 * This key bypasses row-level security completely, so it is used in exactly
 * two places: granting organizer status once a signup code has been checked,
 * and the local seed script. Both are server-only.
 *
 * The key is read from `SUPABASE_SERVICE_ROLE_KEY` rather than a
 * NEXT_PUBLIC_-prefixed name, which is what keeps Next from inlining it into
 * the browser bundle. Importing this module from a client component fails the
 * build for the same reason.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill it in.",
    );
  }

  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey, {
    // There is no user session to keep alive here, and persisting one would
    // write the service role token to disk.
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
