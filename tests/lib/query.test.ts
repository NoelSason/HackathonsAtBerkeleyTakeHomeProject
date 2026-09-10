import { describe, expect, it } from "vitest";
import { parseFilters } from "@/lib/applications/query";

/*
 * Everything parseFilters reads arrives from the query string, so the point
 * of these is that a value nobody anticipated becomes a default rather than
 * reaching Postgres.
 */
describe("parseFilters", () => {
  it("defaults an empty query string to the calibrated ranking", () => {
    expect(parseFilters({})).toEqual({
      q: "",
      role: null,
      status: null,
      school: null,
      sort: "calibrated",
      direction: "desc",
      page: 1,
    });
  });

  describe("falls back rather than trusting the URL", () => {
    it("drops a role that is not in the enum", () => {
      expect(parseFilters({ role: "astronaut" }).role).toBeNull();
    });

    it("drops a status that is not in the enum", () => {
      expect(parseFilters({ status: "pending" }).status).toBeNull();
    });

    it("drops a sort column that is not offered", () => {
      expect(parseFilters({ sort: "email" }).sort).toBe("calibrated");
    });

    it("treats any direction other than asc as descending", () => {
      expect(parseFilters({ dir: "sideways" }).direction).toBe("desc");
      expect(parseFilters({ dir: "asc" }).direction).toBe("asc");
    });

    it("keeps a role and status that are real", () => {
      const filters = parseFilters({ role: "mentor", status: "under_review" });
      expect(filters.role).toBe("mentor");
      expect(filters.status).toBe("under_review");
    });
  });

  describe("clamps the page number", () => {
    it.each([
      ["zero", "0"],
      ["a negative", "-5"],
      ["a word", "abc"],
      ["empty", ""],
    ] as const)("reads %s as page one", (_label, page) => {
      expect(parseFilters({ page }).page).toBe(1);
    });

    it("floors a fractional page", () => {
      expect(parseFilters({ page: "2.9" }).page).toBe(2);
    });

    it("keeps a sensible page", () => {
      expect(parseFilters({ page: "3" }).page).toBe(3);
    });
  });

  describe("sanitises the search term", () => {
    // Commas and parentheses are structural in a PostgREST `or` expression,
    // so "Wu, Jordan" would otherwise be read as two filters rather than one
    // search term.
    it("strips the characters that are structural in a PostgREST filter", () => {
      expect(parseFilters({ q: "Wu, Jordan (UCB)*" }).q).toBe("Wu Jordan UCB");
    });

    it("trims surrounding whitespace", () => {
      expect(parseFilters({ q: "  Amara  " }).q).toBe("Amara");
    });

    it("leaves an ordinary name alone", () => {
      expect(parseFilters({ q: "Rosa Delgado" }).q).toBe("Rosa Delgado");
    });
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseFilters({ role: ["judge", "hacker"] }).role).toBe("judge");
  });

  // The one field with no allow-list, because school names are open-ended.
  // It is safe because the client parameterises the eq() it feeds, but it is
  // the asymmetry worth pinning so a future change notices it.
  it("passes an unknown school through, trimmed", () => {
    expect(parseFilters({ school: "  Fresno State  " }).school).toBe("Fresno State");
  });
});
