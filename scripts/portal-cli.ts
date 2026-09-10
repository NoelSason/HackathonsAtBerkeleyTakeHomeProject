/**
 * Reads the applications pile from a terminal.
 *
 * Run with:  npm run portal -- <command>
 *
 * Signs in as the organizer named in PORTAL_ORGANIZER_EMAIL and answers
 * entirely within that person's row-level security. It never writes anything:
 * see lib/portal/queries.ts, which is the whole surface.
 *
 * Output is plain text rather than JSON because a person reads it. The MCP
 * server next door hands the same functions to an agent instead.
 */
import { parseArgs } from "node:util";
import { attribution, openPortalSession } from "../lib/portal/session.ts";
import {
  getApplication,
  listApplications,
  overviewStats,
  queueStatus,
  reviewerCalibration,
  scoreOutliers,
} from "../lib/portal/queries.ts";
import { APPLICATION_FORMS } from "../lib/applications/forms.ts";
import { ROLE_COPY } from "../lib/applications/roles.ts";
import { statusLabel } from "../lib/applications/statuses.ts";
import { inEventZone } from "../lib/event.ts";

const USAGE = `
Reads the Cal Hacks applications pile. Read-only.

  npm run portal -- stats                       totals, review progress, score spread
  npm run portal -- queue                       how much reading is left, by role
  npm run portal -- calibration                 each reviewer's own mean and spread
  npm run portal -- outliers [--limit 10]       where raw and calibrated ranking disagree
  npm run portal -- show <id>                   one application, its answers and reviews
  npm run portal -- list [filters]              the filtered list

List filters, all optional and all matching the web filters:
  --role hacker|mentor|judge|volunteer
  --status draft|submitted|under_review|accepted|waitlisted|rejected
  --school "UC Berkeley"
  --search "Amara"
  --sort score|calibrated|submitted|name    --direction asc|desc
  --limit 25
`.trim();

/** Pads to a fixed width, counting characters rather than bytes. */
function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value + " ".repeat(width - value.length);
}

function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => (row[column] ?? "").length)),
  );

  const line = (cells: string[]) =>
    cells.map((cell, column) => pad(cell, widths[column])).join("  ").trimEnd();

  return [line(headers), widths.map((width) => "─".repeat(width)).join("  "), ...rows.map(line)].join(
    "\n",
  );
}

function score(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits);
}

function signed(value: number | null): string {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      role: { type: "string" },
      status: { type: "string" },
      school: { type: "string" },
      search: { type: "string" },
      sort: { type: "string" },
      direction: { type: "string" },
      limit: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  const [command, argument] = positionals;

  if (values.help || !command) {
    console.log(USAGE);
    return;
  }

  const limit = values.limit ? Number(values.limit) : undefined;
  const { supabase, actor } = await openPortalSession();

  switch (command) {
    case "list": {
      const { rows, total } = await listApplications(supabase, {
        role: values.role,
        status: values.status,
        school: values.school,
        search: values.search,
        sort: values.sort,
        direction: values.direction,
        limit,
      });

      console.log(
        table(
          ["ID", "APPLICANT", "SCHOOL", "ROLE", "STATUS", "SCORE", "CAL.", "READS"],
          rows.map((row) => [
            String(row.displayId),
            row.fullName,
            row.school ?? "—",
            ROLE_COPY[row.role].label,
            statusLabel(row.status),
            score(row.meanScore),
            signed(row.meanZScore),
            String(row.reviewCount),
          ]),
        ),
      );
      console.log(`\n${rows.length} shown of ${total} matching.`);
      break;
    }

    case "show": {
      if (!argument) throw new Error("Which application? Give the id printed on it, e.g. 2049.");

      const detail = await getApplication(supabase, { displayId: Number(argument) });
      if (!detail) throw new Error(`No application ${argument} that this account can see.`);

      const { application, reviews, reviewsRequired } = detail;

      console.log(`${application.fullName}  ·  APP-${application.displayId}`);
      console.log(
        `${ROLE_COPY[application.role].label} · ${statusLabel(application.status)} · ${
          application.school ?? "no school given"
        } · ${application.email}`,
      );
      console.log(
        `Score ${score(application.meanScore)} · calibrated ${signed(application.meanZScore)} · ` +
          `${application.reviewCount} of ${reviewsRequired} reads`,
      );

      // Walked in form order with the form's own labels, rather than
      // whatever order the jsonb happened to serialise in. The config that
      // renders the web form is the same one read here, so a reworded
      // question changes both at once.
      console.log("\nANSWERS");
      for (const section of APPLICATION_FORMS[application.role].sections) {
        for (const field of section.fields) {
          const answer = application.responses[field.id];
          const text = Array.isArray(answer) ? answer.join(", ") : String(answer ?? "");
          if (text.trim() === "") continue;
          console.log(`\n  ${field.label}\n  ${text.replace(/\n/g, "\n  ")}`);
        }
      }

      console.log(`\nREVIEWS (${reviews.length})`);
      if (reviews.length === 0) console.log("  Nobody has read this one yet.");
      for (const review of reviews) {
        const when = inEventZone(review.writtenAt, { month: "short", day: "numeric" });
        console.log(`\n  ${review.reviewer} — ${review.score}/5 — ${when}`);
        if (review.notes) console.log(`  ${review.notes}`);
      }
      break;
    }

    case "stats": {
      const stats = await overviewStats(supabase);

      console.log(
        table(
          ["", "COUNT"],
          [
            ["Applications", String(stats.totals.all)],
            ["Submitted", String(stats.totals.submitted)],
            ["Still in draft", String(stats.totals.drafts)],
            ["Decided", String(stats.totals.decided)],
            ["Reviews written", String(stats.reviews.written)],
            ["Reviewers", String(stats.reviews.reviewers)],
            ["Median score", stats.reviews.median.toFixed(1)],
            ["Score spread", stats.reviews.stddev.toFixed(2)],
          ],
        ),
      );

      console.log("\nBY ROLE");
      console.log(
        table(
          ["ROLE", "TOTAL", "SUBMITTED", "FULLY READ"],
          stats.by_role.map((row) => [
            row.role,
            String(row.total),
            String(row.submitted),
            String(row.complete),
          ]),
        ),
      );
      break;
    }

    case "queue": {
      const rows = await queueStatus(supabase);

      console.log(
        table(
          ["ROLE", "READS EACH", "BELOW TARGET", "NOBODY HAS READ", "READS DONE"],
          rows.map((row) => [
            ROLE_COPY[row.role].label,
            String(row.target),
            String(row.waiting),
            String(row.unread),
            String(row.reads),
          ]),
        ),
      );
      break;
    }

    case "calibration": {
      const rows = await reviewerCalibration(supabase);

      console.log(
        table(
          ["REVIEWER", "REVIEWS", "THEIR MEAN", "THEIR SPREAD"],
          rows.map((row) => [
            row.reviewer,
            String(row.reviewsWritten),
            score(row.meanScore, 2),
            score(row.spread, 2),
          ]),
        ),
      );
      console.log(
        "\nA score is compared against its own reviewer's mean and spread, not against\n" +
          "the pile, so a four from the harshest reader can outrank a five from the most\n" +
          "generous one.",
      );
      break;
    }

    case "outliers": {
      const outliers = await scoreOutliers(supabase, limit ?? 10);

      console.log(
        table(
          ["ID", "APPLICANT", "ROLE", "SCORE", "CAL.", "RAW #", "CAL. #", "MOVED"],
          outliers.map((outlier) => [
            String(outlier.application.displayId),
            outlier.application.fullName,
            ROLE_COPY[outlier.application.role].label,
            score(outlier.application.meanScore),
            signed(outlier.application.meanZScore),
            String(outlier.rawRank),
            String(outlier.calibratedRank),
            `${outlier.calibratedRank < outlier.rawRank ? "up" : "down"} ${outlier.shift}`,
          ]),
        ),
      );
      console.log(
        "\nWhere the two rankings disagree most. A large move is a reason to read the\n" +
          "application, not a verdict on it.",
      );
      break;
    }

    default:
      console.log(USAGE);
      process.exitCode = 1;
      return;
  }

  console.log(`\n${attribution(actor)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
