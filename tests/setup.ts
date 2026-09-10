/**
 * Runs before every test file.
 *
 * Two jobs, both about the same problem: `lib/env.ts` exports constants that
 * throw at import time when the Supabase variables are missing, and several
 * modules worth testing reach it transitively. Importing `lib/auth.ts` in a
 * bare test process would fail before a single assertion ran.
 *
 * So real credentials are loaded when they exist, and a placeholder fills in
 * when they do not. The placeholder is deliberately recognisable, because the
 * security suite keys off it to decide whether it can run at all.
 */

/** Stands in for a real project URL when .env.local is absent. */
export const PLACEHOLDER_URL = "https://placeholder.invalid";

try {
  // Node 24 reads dotenv files natively, so no dependency for this.
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local. Expected on a fresh clone and on CI.
}

process.env.NEXT_PUBLIC_SUPABASE_URL ??= PLACEHOLDER_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "placeholder-anon-key";

/** True when .env.local supplied a real project, so live tests can run. */
export const hasLiveProject = process.env.NEXT_PUBLIC_SUPABASE_URL !== PLACEHOLDER_URL;
