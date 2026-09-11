/**
 * Produces a CalIntelligence reading for every seeded application, ahead of time.
 *
 * Run with:  npm run warm          (only the ones that have none)
 *            npm run warm -- --force   (all of them, again)
 *
 * Two reasons this exists, and neither is "make the demo look faster than it
 * is". The first is that a reading is cached per application rather than per
 * reviewer, so the second organizer to open one pays nothing — this simply
 * makes the seeded pile behave as it would a week into a real applications
 * season, when somebody has already read most of it. The second is that it is
 * the only way to look at forty readings at once and notice that the rubric is
 * being applied inconsistently.
 *
 * A new applicant signing up and linking a repository is untouched by this.
 * Nothing has been read for them, so the first organizer to open their
 * application generates it live, against the real GitHub API and the real
 * model, exactly as it will run in production.
 *
 * Like the seed, this talks to Supabase with the service role key and writes
 * the table directly rather than through save_application_insight, so the
 * per-organizer daily allowance does not apply to it. That is exactly why it
 * lives in a script run from a developer's machine and never in the deployed
 * app.
 */
import { createClient } from "@supabase/supabase-js";
import { generateInsight, readLinkedRepository, INSIGHT_MODEL } from "../lib/insights/generate.ts";
import type { Database, Json } from "../lib/database.types.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY.");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const force = process.argv.includes("--force");

/**
 * Four at a time.
 *
 * Each application is two model calls and up to six GitHub requests, and both
 * services would rather not receive fifty of those at once. Four keeps a full
 * pile under five minutes without ever being the reason something throttles.
 */
const CONCURRENCY = 4;

type Row = {
  id: string;
  display_id: number;
  role: Database["public"]["Enums"]["application_role"];
  responses: Json;
};

async function main() {
  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, display_id, role, responses")
    .neq("status", "draft")
    .order("display_id");

  if (error) throw error;
  if (!applications) return;

  const { data: existing } = await supabase.from("application_insights").select("application_id");
  const already = new Set((existing ?? []).map((row) => row.application_id));

  const queue = (applications as Row[]).filter((row) => force || !already.has(row.id));

  console.log(
    `${applications.length} submitted applications, ${already.size} already read, ${queue.length} to do.`,
  );
  if (queue.length === 0) return;

  let done = 0;
  let failed = 0;
  let index = 0;

  // A shared index rather than fixed slices, so one slow repository does not
  // leave three workers idle while a fourth finishes alone.
  async function worker() {
    while (index < queue.length) {
      const row = queue[index];
      index += 1;

      const label = `APP-${String(row.display_id).padStart(3, "0")} ${row.role}`;

      try {
        const responses = (row.responses ?? {}) as Record<string, unknown>;
        const repository = await readLinkedRepository(row.role, responses);

        if (repository.blocking) {
          // GitHub has paused us. Writing a reading now would record "we
          // could not read it" as though that were a fact about the
          // applicant, and a later run would have no reason to revisit it.
          console.log(`  ${label}  skipped — ${repository.blocking}`);
          failed += 1;
          continue;
        }

        const result = await generateInsight(row.role, responses, repository);

        if (!result.ok) {
          console.log(`  ${label}  failed — ${result.reason}`);
          failed += 1;
          continue;
        }

        const { error: writeError } = await supabase.from("application_insights").upsert(
          {
            application_id: row.id,
            summary: result.payload.summary,
            specificity: result.payload.specificity,
            specificity_reason: result.payload.specificity_reason,
            claims: result.payload.claims as unknown as Json,
            repo_url: result.payload.repo_url,
            repo_outcome: result.payload.repo_outcome as unknown as Json,
            repo_stats: result.payload.repo_stats as unknown as Json,
            repo_findings: result.payload.repo_findings as unknown as Json,
            model: INSIGHT_MODEL,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "application_id" },
        );

        if (writeError) throw writeError;

        done += 1;
        const findings = result.payload.repo_findings;
        const repoNote = findings
          ? `repo ${findings.corroborates.length}/${findings.adds.length}/${findings.discrepancies.length}`
          : result.payload.repo_outcome.state;

        console.log(
          `  ${label}  specificity ${result.payload.specificity} · ${result.payload.claims.length} quotes · ${repoNote}`,
        );
      } catch (error: unknown) {
        failed += 1;
        console.log(`  ${label}  failed — ${(error as Error).message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`Done. ${done} read, ${failed} left for a later run.`);
}

main().catch((error: unknown) => {
  console.error("Warm failed:", error);
  process.exit(1);
});
