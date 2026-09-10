import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types.ts";
import { buildApplicationQuery, parseFilters, PAGE_SIZE } from "../applications/query.ts";
import {
  SUMMARY_COLUMNS,
  toSummaries,
  toSummary,
  type ApplicationSummary,
} from "../applications/summary.ts";
import { fetchAnalytics, type Analytics } from "../applications/analytics.ts";
import { APPLICATION_FORMS } from "../applications/forms.ts";
import { APPLICATION_ROLES, type ApplicationRole } from "../applications/roles.ts";

/**
 * Every read the CLI and the MCP server can do. There are no writes here.
 *
 * That is the point rather than an omission. A surface that can only read is
 * trivially safe to hand to a script or an agent: the worst it can do is tell
 * you something the person who configured it could already have looked up.
 * The moment it could grade, decide, or trigger the reading aid, "what can
 * this thing do if it misunderstands me" stops having a short answer.
 *
 * Grep this file for insert, update, delete or upsert and you will find
 * none. The only rpc call is organizer_analytics, which is STABLE.
 */

type Client = SupabaseClient<Database>;

/** Reuses the same parser the web filters use, so all three agree. */
export type ListInput = {
  role?: string;
  status?: string;
  school?: string;
  search?: string;
  sort?: string;
  direction?: string;
  limit?: number;
};

export type ListResult = {
  rows: ApplicationSummary[];
  total: number;
};

/**
 * The filtered list, straight off the same query builder the table uses.
 *
 * Filter values arrive from a command line or from a language model, which is
 * to say from somewhere untrusted, so they go through parseFilters exactly as
 * a query string would. An unrecognised role becomes "no role filter" rather
 * than reaching Postgres.
 */
export async function listApplications(
  supabase: Client,
  input: ListInput = {},
): Promise<ListResult> {
  const filters = parseFilters({
    role: input.role,
    status: input.status,
    school: input.school,
    q: input.search,
    sort: input.sort,
    dir: input.direction,
  });

  const limit = Math.min(Math.max(input.limit ?? PAGE_SIZE, 1), 200);
  const query = buildApplicationQuery(supabase, filters, { paginate: false }).range(0, limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { rows: toSummaries(data), total: count ?? 0 };
}

export type ApplicationDetail = {
  application: ApplicationSummary;
  reviews: { reviewer: string; score: number; notes: string; writtenAt: string }[];
  reviewsRequired: number;
};

/** One application with its full answers and every review written on it. */
export async function getApplication(
  supabase: Client,
  ref: { displayId?: number; id?: string },
): Promise<ApplicationDetail | null> {
  if (ref.displayId === undefined && ref.id === undefined) {
    throw new Error("Give either a display id (the number on the application) or a uuid.");
  }

  let lookup = supabase.from("application_summary").select(SUMMARY_COLUMNS);
  lookup = ref.id ? lookup.eq("id", ref.id) : lookup.eq("display_id", ref.displayId!);

  const { data: found, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  const application = found ? toSummary(found) : null;
  if (!application) return null;

  const { data, error } = await supabase
    .from("reviews")
    .select("score, notes, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name)")
    .eq("application_id", application.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return {
    application,
    reviewsRequired: APPLICATION_FORMS[application.role].reviewsRequired,
    reviews: (data ?? []).map((review) => ({
      reviewer: review.reviewer?.full_name ?? "Organizer",
      score: review.score,
      notes: review.notes,
      writtenAt: review.created_at,
    })),
  };
}

/** The same payload the analytics page renders. */
export async function overviewStats(supabase: Client): Promise<Analytics> {
  const analytics = await fetchAnalytics(supabase);
  if (!analytics) throw new Error("Could not read the analytics summary.");
  return analytics;
}

export type ReviewerRow = {
  reviewer: string;
  reviewsWritten: number;
  meanScore: number | null;
  spread: number | null;
};

/**
 * Each reviewer's own mean and spread.
 *
 * This is the table the calibrated score is computed against, so it is what
 * you look at when somebody asks why an application moved.
 */
export async function reviewerCalibration(supabase: Client): Promise<ReviewerRow[]> {
  const { data, error } = await supabase
    .from("reviewer_calibration")
    .select("reviews_written, mean_score, score_stddev, reviewer:profiles!reviews_reviewer_id_fkey(full_name)")
    .order("mean_score", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    reviewer: row.reviewer?.full_name ?? "Organizer",
    reviewsWritten: row.reviews_written ?? 0,
    meanScore: row.mean_score,
    spread: row.score_stddev,
  }));
}

export type QueueRow = {
  role: ApplicationRole;
  target: number;
  waiting: number;
  unread: number;
  reads: number;
};

/**
 * How much reading is left, by role.
 *
 * "Waiting" counts submitted applications that have not yet reached their
 * per-role target, which is the number the review queue is working through.
 * "Unread" is the subset nobody has opened at all, because those are the ones
 * that starve if the queue is not doing its job.
 */
export async function queueStatus(supabase: Client): Promise<QueueRow[]> {
  const { rows } = await listApplications(supabase, { limit: 200 });

  return APPLICATION_ROLES.map((role) => {
    const submitted = rows.filter((row) => row.role === role && row.status !== "draft");
    const target = APPLICATION_FORMS[role].reviewsRequired;

    return {
      role,
      target,
      waiting: submitted.filter((row) => row.reviewCount < target).length,
      unread: submitted.filter((row) => row.reviewCount === 0).length,
      reads: submitted.reduce((total, row) => total + row.reviewCount, 0),
    };
  });
}

export type Outlier = {
  application: ApplicationSummary;
  rawRank: number;
  calibratedRank: number;
  shift: number;
};

/**
 * Where the raw ranking and the calibrated one disagree most.
 *
 * This is the question the calibration feature exists to raise and the one
 * thing no screen in the portal answers directly. The table can sort by
 * either column, but seeing that an applicant sits sixth on one and
 * twenty-first on the other means holding two sorted lists in your head.
 *
 * Both numbers already exist on application_summary, so this is a rank on
 * each and a subtraction — no new SQL, and nothing here can disagree with
 * what the table shows. Only applications somebody has actually read are
 * ranked: an unread one has no scores to compare, which is exactly why the
 * view now reports null for those rather than a misleading zero.
 *
 * A large shift is not a verdict. It says the two orderings disagree about
 * this applicant, which is a prompt to read them rather than a conclusion.
 */
export async function scoreOutliers(supabase: Client, limit = 10): Promise<Outlier[]> {
  const { rows } = await listApplications(supabase, { limit: 200 });

  const reviewed = rows.filter(
    (row) => row.reviewCount > 0 && row.meanScore !== null && row.meanZScore !== null,
  );

  const rankBy = (key: "meanScore" | "meanZScore") => {
    const order = [...reviewed].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
    const ranks = new Map<string, number>();

    order.forEach((row, index) => {
      // Ties share a rank, so two identical scores do not invent a shift
      // out of whatever order the database happened to return them in.
      const previous = order[index - 1];
      if (previous && previous[key] === row[key]) ranks.set(row.id, ranks.get(previous.id)!);
      else ranks.set(row.id, index + 1);
    });

    return ranks;
  };

  const rawRanks = rankBy("meanScore");
  const calibratedRanks = rankBy("meanZScore");

  return reviewed
    .map((application) => {
      const rawRank = rawRanks.get(application.id)!;
      const calibratedRank = calibratedRanks.get(application.id)!;
      return { application, rawRank, calibratedRank, shift: Math.abs(rawRank - calibratedRank) };
    })
    .filter((outlier) => outlier.shift > 0)
    .sort((a, b) => b.shift - a.shift)
    .slice(0, limit);
}
