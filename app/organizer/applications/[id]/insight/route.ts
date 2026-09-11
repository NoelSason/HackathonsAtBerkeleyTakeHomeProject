import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  generateInsight,
  readLinkedRepository,
  INSIGHT_MODEL,
  type InsightEvent,
} from "@/lib/insights/generate";
import type { Json } from "@/lib/database.types";

/**
 * CalIntelligence, streamed.
 *
 * This is the one place in the portal that is a route handler rather than a
 * server action, and the reason is latency you can watch. A server action is a
 * single round trip: the reviewer clicks, a spinner turns for the better part
 * of half a minute, and everything appears at once. This endpoint writes one
 * JSON object per line as each part of the work lands — what the link turned
 * out to be, the raw repository facts, the summary as the model writes it, the
 * rating, then the comparison — so the panel fills in from the top while the
 * slower half is still running.
 *
 * Newline-delimited JSON rather than server-sent events. The only consumer is
 * the panel in this repository, EventSource cannot issue a POST, and `event:`
 * and `data:` framing would buy nothing here except a parser to write.
 *
 * Every rule the server action enforced still applies, in the same order, and
 * two of them now happen before a single token is spent.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Two model calls in parallel, plus eight GitHub requests before them. Sixty
// seconds is the platform default and is not comfortably clear of a slow one.
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: RouteContext<"/organizer/applications/[id]/insight">,
) {
  const { id } = await params;

  const profile = await getProfile();
  if (!profile || profile.staff_role === null) {
    // A route handler has no layout to redirect through, and the caller is
    // fetch() rather than a browser navigation, so this says no in JSON.
    return Response.json({ error: "Organizers only." }, { status: 403 });
  }

  if (!z.uuid().safeParse(id).success) {
    return Response.json({ error: "That application no longer exists." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: InsightEvent | { type: "error"; message: string } | { type: "done"; remaining: number | null; model: string; generatedAt: string }) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const supabase = await createClient();

        /*
         * Any organizer, with no requirement to have scored first.
         *
         * That requirement existed and was removed. It was modelled on the
         * blind queue, and the analogy does not survive contact with this
         * page: the detail page already shows the applicant's name, their
         * school and every score another organizer has left, so gating a
         * summary of the answers printed above it protected nothing.
         *
         * The queue shows a reading too, but only the half drawn from the
         * answers already on the card. Its repository section waits for the
         * same Reveal that uncovers the name, because a repository address is
         * an account name. See QueueInsight.
         */
        const { data: application } = await supabase
          .from("applications")
          .select("role, responses, status")
          .eq("id", id)
          .maybeSingle();

        if (!application) {
          send({ type: "error", message: "That application no longer exists." });
          return;
        }
        if (application.status === "draft") {
          send({ type: "error", message: "This application has not been submitted yet." });
          return;
        }

        const responses = (application.responses ?? {}) as Record<string, unknown>;

        send({ type: "stage", label: "Looking at what they linked" });

        // Before the budget claim, and that ordering is the whole point. If
        // GitHub has paused us, the reviewer is told so and charged nothing:
        // our own rate limit is not something to spend their allowance on.
        const repository = await readLinkedRepository(application.role, responses);
        if (repository.blocking) {
          send({ type: "error", message: repository.blocking });
          return;
        }

        send({ type: "stage", label: "Checking your allowance" });

        // Claimed before the model is called, so a request that is going to be
        // refused costs nothing. The function raises rather than returning a
        // flag, and it does the counting itself: putting the limit in the
        // database is what makes it a limit, since save_application_insight is
        // reachable straight off the REST API by any organizer.
        const { data: remaining, error: budgetError } = await supabase.rpc("claim_insight_budget", {
          p_application_id: id,
        });

        if (budgetError) {
          // P0001 is the daily cap, P0002 the regeneration cooldown. Both
          // carry a message written to be read by an organizer; anything else
          // is ours and becomes generic copy rather than leaking.
          const known = budgetError.code === "P0001" || budgetError.code === "P0002";
          send({ type: "error", message: known ? budgetError.message : "Could not start that reading." });
          return;
        }

        const result = await generateInsight(application.role, responses, repository, send);

        if (!result.ok) {
          send({ type: "error", message: result.reason });
          return;
        }

        send({ type: "stage", label: "Saving" });

        const { error: saveError } = await supabase.rpc("save_application_insight", {
          p_application_id: id,
          p_summary: result.payload.summary,
          p_specificity: result.payload.specificity,
          p_specificity_reason: result.payload.specificity_reason,
          p_claims: result.payload.claims as unknown as Json,
          p_repo_url: result.payload.repo_url,
          p_repo_outcome: result.payload.repo_outcome as unknown as Json,
          p_repo_stats: result.payload.repo_stats as unknown as Json,
          p_repo_findings: result.payload.repo_findings as unknown as Json,
          p_model: INSIGHT_MODEL,
        });

        if (saveError) {
          send({ type: "error", message: "Read it, but could not save it." });
          return;
        }

        send({
          type: "done",
          remaining: typeof remaining === "number" ? remaining : null,
          model: INSIGHT_MODEL,
          generatedAt: new Date().toISOString(),
        });
      } catch {
        // Whatever went wrong, the reviewer gets a sentence rather than a
        // connection that closes with no explanation.
        send({ type: "error", message: "Something went wrong reading this one." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Belt and braces for any proxy that would otherwise hold the whole
      // response back until it is complete, which would undo the point.
      "X-Accel-Buffering": "no",
    },
  });
}
