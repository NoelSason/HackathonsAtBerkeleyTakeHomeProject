import type { RepoFacts } from "./github.ts";
import type { Comparison, RepoOutcome } from "./generate.ts";

export type Claim = { field: string; quote: string };

/** A reading as it comes back out of the database, ready to render. */
export type StoredInsight = {
  summary: string;
  specificity: number;
  specificity_reason: string;
  claims: Claim[];
  repo_url: string | null;
  repo_outcome: RepoOutcome | null;
  repo_stats: RepoFacts | null;
  repo_findings: Comparison | null;
  model: string;
  generated_at: string;
};

/** The columns both pages select. Named once so they cannot drift apart. */
export const INSIGHT_COLUMNS =
  "summary, specificity, specificity_reason, claims, repo_url, repo_outcome, repo_stats, repo_findings, model, generated_at";

export type InsightRow = {
  summary: string;
  specificity: number;
  specificity_reason: string;
  claims: unknown;
  repo_url: string | null;
  repo_outcome: unknown;
  repo_stats: unknown;
  repo_findings: unknown;
  model: string;
  generated_at: string;
};

/**
 * Fills in a stored facts blob that predates the fields the panel now reads.
 *
 * The facts CalIntelligence records grew — commit subjects, a directory
 * breakdown, file types, a dependency manifest — and rows written before that
 * carry none of them. Casting the stored jsonb straight to `RepoFacts` claims
 * a shape the row does not have, and the panel duly crashed on
 * `facts.recentCommits.length` with "Cannot read properties of undefined".
 *
 * **A cast is an assertion, and this is the one place in the app where the
 * data is genuinely older than the type.** Every field the panel touches gets
 * a default here, so an old row renders as a reading with less in it rather
 * than as a stack trace.
 */
export function toRepoFacts(value: unknown): RepoFacts | null {
  if (typeof value !== "object" || value === null) return null;

  const stored = value as Partial<RepoFacts>;
  const array = <T,>(input: unknown): T[] => (Array.isArray(input) ? (input as T[]) : []);

  return {
    ...(stored as RepoFacts),
    topics: array(stored.topics),
    homepage: stored.homepage ?? null,
    hasPages: stored.hasPages ?? false,
    watchers: stored.watchers ?? 0,
    sizeKb: stored.sizeKb ?? 0,
    recentCommits: array(stored.recentCommits),
    activeDays: stored.activeDays ?? null,
    firstCommitAt: stored.firstCommitAt ?? null,
    topContributors: array(stored.topContributors),
    totalBytes: stored.totalBytes ?? null,
    topLevelEntries: array(stored.topLevelEntries),
    directories: array(stored.directories),
    extensions: array(stored.extensions),
    largestFiles: array(stored.largestFiles),
    workflowFiles: array(stored.workflowFiles),
    otherCiFiles: array(stored.otherCiFiles),
    testFileCount: stored.testFileCount ?? 0,
    testFileSamples: array(stored.testFileSamples),
    dependencyManifests: array(stored.dependencyManifests),
    manifestPath: stored.manifestPath ?? null,
    manifestExcerpt: stored.manifestExcerpt ?? null,
    languageShare: stored.languageShare ?? {},
  };
}

/**
 * Narrows a stored row into the shape both panels render.
 *
 * Four of these columns are jsonb, so they arrive typed as `Json`. Rather than
 * assert them into place, each is checked for the shape the panel actually
 * reaches into and anything malformed is dropped. A row written by an earlier
 * version of the generator — one with no claims and no recorded outcome —
 * therefore renders as a reading with those sections missing, rather than
 * throwing halfway through a render.
 */
export function toStoredInsight(row: InsightRow | null): StoredInsight | null {
  if (!row) return null;

  const findings = row.repo_findings;
  const isFindings =
    typeof findings === "object" &&
    findings !== null &&
    Array.isArray((findings as { corroborates?: unknown }).corroborates) &&
    Array.isArray((findings as { adds?: unknown }).adds) &&
    Array.isArray((findings as { discrepancies?: unknown }).discrepancies);

  // `what_it_is` arrived after the first rows were written, so a stored
  // reading without it degrades to no description rather than to a crash.
  const described =
    isFindings && typeof (findings as { what_it_is?: unknown }).what_it_is === "string"
      ? (findings as { what_it_is: string }).what_it_is
      : "";

  const claims = Array.isArray(row.claims)
    ? row.claims.filter(
        (claim): claim is Claim =>
          typeof claim === "object" &&
          claim !== null &&
          typeof (claim as { field?: unknown }).field === "string" &&
          typeof (claim as { quote?: unknown }).quote === "string",
      )
    : [];

  const outcome =
    typeof row.repo_outcome === "object" &&
    row.repo_outcome !== null &&
    typeof (row.repo_outcome as { state?: unknown }).state === "string"
      ? (row.repo_outcome as RepoOutcome)
      : null;

  return {
    summary: row.summary,
    specificity: row.specificity,
    specificity_reason: row.specificity_reason,
    claims,
    repo_url: row.repo_url,
    repo_outcome: outcome,
    repo_stats: toRepoFacts(row.repo_stats),
    repo_findings: isFindings
      ? {
          what_it_is: described,
          ...(findings as { corroborates: string[]; adds: string[]; discrepancies: string[] }),
        }
      : null,
    model: row.model,
    generated_at: row.generated_at,
  };
}
