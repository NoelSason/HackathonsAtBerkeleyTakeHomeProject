import { describe, expect, it } from "vitest";
import {
  APPLICATION_FORMS,
  draftSchema,
  isSectionComplete,
  submitSchema,
} from "@/lib/applications/forms";
import { APPLICATION_ROLES } from "@/lib/applications/roles";

/*
 * The two schemas are built from the same config that renders the form, so
 * these check the rule that separates them: a draft is validated for shape,
 * a submission for completeness. Autosave fires mid-sentence, so anything
 * stricter on the draft path would mean silently dropping somebody's work.
 */
describe("draftSchema", () => {
  it.each(APPLICATION_ROLES)("accepts an empty %s draft", (role) => {
    expect(draftSchema(role).safeParse({}).success).toBe(true);
  });

  it("accepts a half-typed answer", () => {
    expect(draftSchema("hacker").safeParse({ proud_project: "I built a" }).success).toBe(true);
  });

  it("still rejects a value of the wrong shape", () => {
    // tracks is a multi-select, so a bare string is not a partial answer,
    // it is a different type. Shape is the one thing a draft does check.
    expect(draftSchema("hacker").safeParse({ tracks: "AI / ML" }).success).toBe(false);
  });
});

describe("submitSchema", () => {
  it("rejects an empty submission", () => {
    expect(submitSchema("hacker").safeParse({}).success).toBe(false);
  });

  it("rejects a submission missing one required field", () => {
    const missingOne = { ...completeHacker() };
    delete missingOne.proud_project;
    expect(submitSchema("hacker").safeParse(missingOne).success).toBe(false);
  });

  it("rejects a required field left as an empty string", () => {
    expect(submitSchema("hacker").safeParse({ ...completeHacker(), major: "" }).success).toBe(false);
  });

  it("accepts a complete submission", () => {
    expect(submitSchema("hacker").safeParse(completeHacker()).success).toBe(true);
  });

  it("rejects a select value that is not one of the options", () => {
    const parsed = submitSchema("hacker").safeParse({ ...completeHacker(), level: "Professor" });
    expect(parsed.success).toBe(false);
  });

  it("accepts a complete submission for every role", () => {
    for (const role of APPLICATION_ROLES) {
      expect(submitSchema(role).safeParse(completeFor(role)).success).toBe(true);
    }
  });
});

describe("isSectionComplete", () => {
  it("calls a section with no required fields complete against nothing", () => {
    // Every role opens with the shared basics section, where pronouns and
    // phone are both optional.
    const basics = APPLICATION_FORMS.hacker.sections[0];
    expect(isSectionComplete(basics, {})).toBe(true);
  });

  it("is false while a required field is unanswered", () => {
    const education = APPLICATION_FORMS.hacker.sections[1];
    expect(isSectionComplete(education, {})).toBe(false);
  });

  it("is false for a required field holding only whitespace", () => {
    const education = APPLICATION_FORMS.hacker.sections[1];
    const answers = Object.fromEntries(education.fields.map((field) => [field.id, "x"]));
    expect(isSectionComplete(education, { ...answers, major: "   " })).toBe(false);
  });

  it("is false for a required multi-select left empty", () => {
    const mentorAreas = APPLICATION_FORMS.mentor.sections.find((section) =>
      section.fields.some((field) => field.id === "areas"),
    );
    if (!mentorAreas) throw new Error("mentor form no longer has an areas field");

    const answers = Object.fromEntries(mentorAreas.fields.map((field) => [field.id, "x"]));
    expect(isSectionComplete(mentorAreas, { ...answers, areas: [] })).toBe(false);
    expect(isSectionComplete(mentorAreas, { ...answers, areas: ["AI / ML"] })).toBe(true);
  });

  it("agrees with submitSchema across every section of every role", () => {
    for (const role of APPLICATION_ROLES) {
      const answers = completeFor(role);
      for (const section of APPLICATION_FORMS[role].sections) {
        expect(isSectionComplete(section, answers)).toBe(true);
      }
    }
  });
});

/** A submission that answers every required field for a role. */
function completeFor(role: (typeof APPLICATION_ROLES)[number]): Record<string, unknown> {
  const answers: Record<string, unknown> = {};

  for (const section of APPLICATION_FORMS[role].sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      if (field.type === "multi_select") answers[field.id] = [field.options?.[0] ?? ""];
      else if (field.options) answers[field.id] = field.options[0];
      else answers[field.id] = "An answer.";
    }
  }

  return answers;
}

function completeHacker() {
  return completeFor("hacker");
}
