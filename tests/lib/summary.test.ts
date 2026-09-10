import { describe, expect, it } from "vitest";
import { toSummaries, toSummary } from "@/lib/applications/summary";

/*
 * Postgres reports every column of a view as nullable, because it cannot
 * prove the inner join on profiles guarantees a name. toSummary narrows that
 * once, in one place, instead of scattering `?? ""` through every table cell.
 * These pin which columns are load-bearing and which are allowed to be null.
 */

type Row = Parameters<typeof toSummary>[0];

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "a2c1c0de-0000-4000-8000-000000000001",
    display_id: 2049,
    user_id: "b2c1c0de-0000-4000-8000-000000000002",
    role: "hacker",
    status: "under_review",
    responses: { major: "EECS" },
    submitted_at: "2026-08-29T20:48:00.000Z",
    full_name: "Amara Okafor",
    email: "amara@calhacks.demo",
    school: "UC Berkeley",
    review_count: 3,
    mean_score: 4.67,
    mean_z_score: 0.984,
    ...overrides,
  };
}

describe("toSummary", () => {
  it("maps a complete row into the shape the pages use", () => {
    expect(toSummary(row())).toEqual({
      id: "a2c1c0de-0000-4000-8000-000000000001",
      displayId: 2049,
      userId: "b2c1c0de-0000-4000-8000-000000000002",
      role: "hacker",
      status: "under_review",
      responses: { major: "EECS" },
      submittedAt: "2026-08-29T20:48:00.000Z",
      fullName: "Amara Okafor",
      email: "amara@calhacks.demo",
      school: "UC Berkeley",
      reviewCount: 3,
      meanScore: 4.67,
      meanZScore: 0.984,
    });
  });

  describe("returns null rather than rendering a row of blanks", () => {
    it.each(["id", "display_id", "user_id", "role", "status", "full_name", "email"] as const)(
      "when %s is null",
      (column) => {
        expect(toSummary(row({ [column]: null }))).toBeNull();
      },
    );
  });

  describe("allows the columns that are genuinely optional", () => {
    it("keeps a draft with no submission date", () => {
      expect(toSummary(row({ submitted_at: null, status: "draft" }))?.submittedAt).toBeNull();
    });

    it("keeps an applicant who gave no school", () => {
      expect(toSummary(row({ school: null }))?.school).toBeNull();
    });

    it("treats absent responses as an empty object", () => {
      expect(toSummary(row({ responses: null }))?.responses).toEqual({});
    });

    // An unread application has no scores at all. Since the view was fixed,
    // both come back null rather than mean_z_score arriving as 0.
    it("keeps an unread application, with both scores null", () => {
      const summary = toSummary(row({ review_count: 0, mean_score: null, mean_z_score: null }));
      expect(summary?.reviewCount).toBe(0);
      expect(summary?.meanScore).toBeNull();
      expect(summary?.meanZScore).toBeNull();
    });

    it("counts a null review_count as zero", () => {
      expect(toSummary(row({ review_count: null }))?.reviewCount).toBe(0);
    });
  });
});

describe("toSummaries", () => {
  it("returns an empty list for no rows", () => {
    expect(toSummaries(null)).toEqual([]);
    expect(toSummaries([])).toEqual([]);
  });

  it("drops a malformed row and keeps the rest", () => {
    const rows = [row(), row({ full_name: null }), row({ display_id: 2050 })];
    const summaries = toSummaries(rows);

    expect(summaries).toHaveLength(2);
    expect(summaries.map((summary) => summary.displayId)).toEqual([2049, 2050]);
  });
});
