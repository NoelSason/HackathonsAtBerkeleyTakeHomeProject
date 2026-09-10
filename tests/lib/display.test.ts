import { describe, expect, it } from "vitest";
import { initials } from "@/lib/auth";
import { generaliseSchool } from "@/lib/applications/school-groups";
import { cell } from "@/lib/applications/csv";
import { daysUntilDeadline, inEventZone, timelineAt } from "@/lib/event";
import { statusLabel } from "@/lib/applications/statuses";

describe("initials", () => {
  it("takes the first letter of the first two names", () => {
    expect(initials({ full_name: "Priya Raman", email: "p@example.com" })).toBe("PR");
  });

  it("ignores anything past the second name", () => {
    expect(initials({ full_name: "Diego Fernández García", email: "d@example.com" })).toBe("DF");
  });

  it("handles a single name", () => {
    expect(initials({ full_name: "Prince", email: "p@example.com" })).toBe("P");
  });

  it("falls back to the email when there is no name", () => {
    expect(initials({ full_name: "", email: "quinn@example.com" })).toBe("QU");
  });

  it("copes with extra whitespace", () => {
    expect(initials({ full_name: "  Sam   Torres  ", email: "s@example.com" })).toBe("ST");
  });
});

/*
 * This one hides applicant identity in the blind queue, so being exactly
 * right matters more than the size of the function suggests.
 */
describe("generaliseSchool", () => {
  it("maps a school it knows", () => {
    expect(generaliseSchool("UC Berkeley")).toBe("Large public university · CA");
  });

  it("withholds a school it does not know rather than guessing", () => {
    expect(generaliseSchool("Nowhere Polytechnic")).toBe("School withheld");
  });

  it("says so when no school was given", () => {
    expect(generaliseSchool(null)).toBe("Not given");
    expect(generaliseSchool("")).toBe("Not given");
  });

  // SCHOOL_GROUPS is an object literal, so a plain lookup on these returns
  // Object.prototype and a function respectively. Both are truthy, so the
  // `??` fallback would not have caught them and a non-string would have
  // reached the queue.
  it.each(["__proto__", "constructor", "toString", "hasOwnProperty"])(
    "withholds the inherited property %s",
    (name) => {
      expect(generaliseSchool(name)).toBe("School withheld");
    },
  );
});

/*
 * A spreadsheet executes a cell beginning with an operator, and these files
 * are built from text that applicants typed.
 */
describe("cell", () => {
  it("renders null as empty", () => {
    expect(cell(null)).toBe("");
  });

  it("leaves ordinary text alone", () => {
    expect(cell("Amara Okafor")).toBe("Amara Okafor");
  });

  it("renders a number", () => {
    expect(cell(4.67)).toBe("4.67");
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)"])("defuses the formula %s", (formula) => {
    expect(cell(formula)).toBe(`'${formula}`);
  });

  it("quotes a value containing a comma", () => {
    expect(cell("Wu, Jordan")).toBe('"Wu, Jordan"');
  });

  it("doubles an embedded quote and wraps the cell", () => {
    expect(cell('She said "yes"')).toBe('"She said ""yes"""');
  });

  it("quotes a value containing a newline", () => {
    expect(cell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("puts the apostrophe inside the quotes when a value needs both", () => {
    expect(cell("=1+1,2")).toBe(`"'=1+1,2"`);
  });
});

describe("statusLabel", () => {
  it("reads the two-word statuses as words", () => {
    expect(statusLabel("under_review")).toBe("Under review");
    expect(statusLabel("waitlisted")).toBe("Waitlisted");
  });
});

describe("timelineAt", () => {
  it("marks only the milestones that have passed", () => {
    // Mid-September: applications are open, the priority deadline has not
    // arrived. The hand-written flags this replaced said otherwise.
    const entries = timelineAt(new Date("2026-09-10T12:00:00-07:00"));
    expect(entries.map((entry) => entry.done)).toEqual([true, false, false, false, false]);
  });

  it("marks everything done once the event has started", () => {
    const entries = timelineAt(new Date("2026-10-24T12:00:00-07:00"));
    expect(entries.every((entry) => entry.done)).toBe(true);
  });

  it("marks nothing done before applications open", () => {
    const entries = timelineAt(new Date("2026-08-01T12:00:00-07:00"));
    expect(entries.some((entry) => entry.done)).toBe(false);
  });
});

describe("daysUntilDeadline", () => {
  it("counts whole days remaining", () => {
    expect(daysUntilDeadline(new Date("2026-09-30T12:00:00-07:00"))).toBe(3);
  });

  it("never goes negative once the deadline has passed", () => {
    expect(daysUntilDeadline(new Date("2026-11-01T12:00:00-07:00"))).toBe(0);
  });
});

/*
 * The same instant used to render as two different times depending on
 * whether a server component or a client component formatted it.
 */
describe("inEventZone", () => {
  it("formats on Pacific time regardless of where it runs", () => {
    // 20:48 UTC is 13:48 Pacific on this date.
    const formatted = inEventZone("2026-08-29T20:48:00.000Z", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    expect(formatted).toBe("Aug 29, 13:48");
  });

  it("puts a late-evening UTC timestamp on the previous Pacific day", () => {
    expect(inEventZone("2026-09-11T05:00:00.000Z", { month: "short", day: "numeric" })).toBe(
      "Sep 10",
    );
  });
});
