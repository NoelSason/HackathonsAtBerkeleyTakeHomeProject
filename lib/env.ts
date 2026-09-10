function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/*
 * The literal `process.env.NEXT_PUBLIC_…` expressions below have to be written
 * out in full. Next substitutes those exact expressions with their values when
 * it builds the client bundle, and it cannot do that for a dynamic lookup like
 * `process.env[name]` — that form survives into the browser as undefined.
 * Passing the literal in as an argument keeps the substitution working while
 * still routing through one check.
 */
export const SUPABASE_URL = requireEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = requireEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
