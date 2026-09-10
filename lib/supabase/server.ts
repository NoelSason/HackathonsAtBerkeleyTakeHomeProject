import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * A Supabase client bound to the signed-in user's cookies.
 *
 * Every server component, route handler and server action goes through this,
 * so queries run as that user and the row-level security policies apply. It
 * is a function rather than a shared singleton because each request carries
 * its own cookies, and a module-level client would leak one user's session
 * into another user's request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies, and Supabase calls this
          // whenever it rotates an expiring token. Swallowing it is correct
          // here: the proxy runs on every request and writes the refreshed
          // cookie there, so nothing is lost.
        }
      },
    },
  });
}
