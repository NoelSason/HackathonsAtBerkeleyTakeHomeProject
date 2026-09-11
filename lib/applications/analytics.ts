import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { APPLICATION_FORMS } from "./forms";
import { APPLICATION_ROLES, type ApplicationRole } from "./roles";

/*
 * The analytics function returns jsonb, which arrives typed as `Json`.
 *
 * Parsing it with a schema rather than casting means a change to the SQL
 * that this page has not caught up with fails loudly here, instead of
 * rendering a dashboard full of undefined. It is the same argument as
 * validating a third-party API response: the database is trusted, but the
 * shape of a hand-built jsonb object is not something the type system can
 * check on its own.
 */
const analyticsSchema = z.object({
  totals: z.object({
    all: z.number(),
    submitted: z.number(),
    decided: z.number(),
    drafts: z.number(),
  }),
  reviews: z.object({
    written: z.number(),
    reviewers: z.number(),
    median: z.number(),
    stddev: z.number(),
  }),
  by_role: z.array(
    z.object({
      role: z.string(),
      total: z.number(),
      submitted: z.number(),
      complete: z.number(),
    }),
  ),
  by_school: z.array(z.object({ school: z.string(), total: z.number() })),
  score_distribution: z.array(z.object({ score: z.number(), total: z.number() })),
  by_week: z.array(z.object({ week: z.string(), total: z.number() })),
});

export type Analytics = z.infer<typeof analyticsSchema>;

/** The per-role read targets, shaped for the SQL function's parameter. */
function reviewTargets(): Record<ApplicationRole, number> {
  return Object.fromEntries(
    APPLICATION_ROLES.map((role) => [role, APPLICATION_FORMS[role].reviewsRequired]),
  ) as Record<ApplicationRole, number>;
}

/**
 * Takes the client rather than building one.
 *
 * The server-component client reads cookies through next/headers, which ties
 * anything calling it to a request inside Next. Passing the client in lets
 * the same query run from the organizer CLI, where the caller has signed in
 * with a password instead of carrying a session cookie.
 */
export async function fetchAnalytics(
  supabase: SupabaseClient<Database>,
): Promise<Analytics | null> {
  const { data, error } = await supabase.rpc("organizer_analytics", {
    p_targets: reviewTargets(),
  });

  if (error) return null;

  const parsed = analyticsSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
