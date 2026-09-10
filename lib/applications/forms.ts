import { z } from "zod";
import type { ApplicationRole } from "./roles";

/*
 * Every question in the portal is defined here, and one renderer draws all of
 * them. Nothing about a hacker application is special-cased in a component.
 *
 * The payoff is that the same config drives four things that would otherwise
 * drift apart: the fields on screen, the section navigation, the server-side
 * validation schema, and the read-only view an organizer sees. Changing a
 * question next year means editing this file, not hunting through JSX.
 */

export type FieldType = "short_text" | "long_text" | "select" | "multi_select" | "url";

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  /** select and multi_select only. */
  options?: readonly string[];
  /** long_text only. Enforced in the browser and again on the server. */
  maxLength?: number;
};

export type Section = {
  id: string;
  title: string;
  blurb?: string;
  fields: readonly Field[];
};

export type ApplicationForm = {
  /** Shown on the role picker so nobody starts a form blind. */
  estimatedMinutes: number;
  /**
   * How many independent reads this role needs before it is decided.
   *
   * A hacker application is a judgement call and gets three. A volunteer
   * application is closer to a checklist and gets one. This drives the review
   * queue ordering and the completion figure on the analytics page.
   */
  reviewsRequired: number;
  sections: readonly Section[];
};

const PRONOUNS = ["she/her", "he/him", "they/them", "Prefer not to say", "Other"] as const;

const TRACKS = [
  "AI / ML",
  "Civic tech",
  "Hardware",
  "Health",
  "Fintech",
  "Climate",
  "Developer tools",
] as const;

const SHIFTS = [
  "Friday evening",
  "Saturday morning",
  "Saturday afternoon",
  "Saturday night",
  "Sunday morning",
  "Sunday afternoon",
] as const;

const BASICS: Section = {
  id: "basics",
  title: "Basics",
  blurb: "Your name, email and school come from your account.",
  fields: [
    { id: "pronouns", label: "Pronouns", type: "select", options: PRONOUNS },
    {
      id: "phone",
      label: "Phone",
      type: "short_text",
      help: "Only used for day-of logistics.",
      placeholder: "(510) 555-0142",
    },
  ],
};

export const APPLICATION_FORMS: Record<ApplicationRole, ApplicationForm> = {
  hacker: {
    estimatedMinutes: 15,
    reviewsRequired: 3,
    sections: [
      BASICS,
      {
        id: "education",
        title: "Education",
        fields: [
          {
            id: "level",
            label: "Level of study",
            type: "select",
            required: true,
            options: ["Undergraduate", "Master's", "PhD", "Bootcamp", "Not currently enrolled"],
          },
          {
            id: "graduation",
            label: "Expected graduation",
            type: "select",
            required: true,
            options: ["2026", "2027", "2028", "2029", "2030 or later"],
          },
          {
            id: "major",
            label: "Major or focus",
            type: "short_text",
            required: true,
            placeholder: "EECS",
          },
        ],
      },
      {
        id: "experience",
        title: "Experience",
        blurb: "Nothing here is disqualifying. First-time hackers are welcome.",
        fields: [
          {
            id: "hackathons_attended",
            label: "Hackathons attended",
            type: "select",
            required: true,
            options: ["First-time", "1–2", "3–5", "6 or more"],
          },
          {
            id: "shipping_comfort",
            label: "Comfort with shipping code",
            type: "select",
            required: true,
            options: [
              "Still learning the basics",
              "I can follow a tutorial and adapt it",
              "I've built projects end to end",
              "I ship production code regularly",
            ],
          },
          {
            id: "portfolio",
            label: "Link to something you've made",
            type: "url",
            placeholder: "github.com/yourname/project",
          },
          {
            id: "tracks",
            label: "Which tracks interest you?",
            type: "multi_select",
            options: TRACKS,
          },
        ],
      },
      {
        id: "essays",
        title: "Essays",
        blurb: "Specific beats polished. We would rather read about one real thing.",
        fields: [
          {
            id: "proud_project",
            label: "Tell us about a project you're proud of",
            type: "long_text",
            required: true,
            maxLength: 1000,
            help: "What was hard about it, and what did you do about that?",
          },
          {
            id: "why_cal_hacks",
            label: "Why Cal Hacks?",
            type: "long_text",
            required: true,
            maxLength: 800,
          },
        ],
      },
      {
        id: "logistics",
        title: "Logistics",
        fields: [
          {
            id: "travel",
            label: "Are you travelling to Berkeley?",
            type: "select",
            required: true,
            options: [
              "I live locally",
              "Travelling, no reimbursement needed",
              "Travelling, requesting reimbursement",
            ],
          },
          { id: "dietary", label: "Dietary restrictions", type: "short_text" },
          {
            id: "accessibility",
            label: "Anything we should know to make the weekend work for you?",
            type: "long_text",
            maxLength: 300,
          },
        ],
      },
    ],
  },

  mentor: {
    estimatedMinutes: 10,
    reviewsRequired: 2,
    sections: [
      BASICS,
      {
        id: "background",
        title: "Background",
        fields: [
          {
            id: "current_role",
            label: "Current role",
            type: "short_text",
            required: true,
            placeholder: "Backend engineer",
          },
          {
            id: "organization",
            label: "Company or school",
            type: "short_text",
            required: true,
          },
          {
            id: "years_experience",
            label: "Years building software",
            type: "select",
            required: true,
            options: ["1–2", "3–5", "6–10", "More than 10"],
          },
        ],
      },
      {
        id: "expertise",
        title: "Expertise and availability",
        blurb: "Teams get matched to mentors by area, so be honest about depth.",
        fields: [
          {
            id: "areas",
            label: "Areas you can mentor in",
            type: "multi_select",
            required: true,
            options: TRACKS,
          },
          {
            id: "stack",
            label: "Languages and frameworks you know well",
            type: "short_text",
            required: true,
            placeholder: "Python, Postgres, React",
          },
          {
            id: "shifts",
            label: "Shifts you can cover",
            type: "multi_select",
            required: true,
            options: SHIFTS,
          },
          {
            id: "presence",
            label: "On-site or remote",
            type: "select",
            required: true,
            options: ["On-site", "Remote", "Either"],
          },
        ],
      },
      {
        id: "approach",
        title: "Approach",
        fields: [
          {
            id: "mentoring_approach",
            label: "A team is stuck and out of time. What do you do?",
            type: "long_text",
            required: true,
            maxLength: 600,
          },
        ],
      },
    ],
  },

  judge: {
    estimatedMinutes: 8,
    reviewsRequired: 2,
    sections: [
      BASICS,
      {
        id: "background",
        title: "Background",
        fields: [
          { id: "current_role", label: "Current role", type: "short_text", required: true },
          { id: "organization", label: "Organization", type: "short_text", required: true },
          {
            id: "judging_experience",
            label: "Have you judged before?",
            type: "select",
            required: true,
            options: ["First time", "Once or twice", "Several times", "Regularly"],
          },
        ],
      },
      {
        id: "expertise",
        title: "Expertise",
        fields: [
          {
            id: "tracks",
            label: "Tracks you're qualified to judge",
            type: "multi_select",
            required: true,
            options: TRACKS,
          },
          {
            id: "evaluation_strengths",
            label: "What do you look for in a project?",
            type: "long_text",
            required: true,
            maxLength: 500,
          },
        ],
      },
      {
        id: "availability",
        title: "Availability",
        fields: [
          {
            id: "sunday_availability",
            label: "Sunday, October 25",
            type: "select",
            required: true,
            options: ["All afternoon", "Early afternoon only", "Late afternoon only"],
          },
          {
            id: "conflicts",
            label: "Any teams or companies you'd need to recuse yourself from?",
            type: "long_text",
            maxLength: 300,
          },
        ],
      },
    ],
  },

  volunteer: {
    estimatedMinutes: 5,
    reviewsRequired: 1,
    sections: [
      BASICS,
      {
        id: "availability",
        title: "Availability",
        fields: [
          {
            id: "shifts",
            label: "Shifts you can cover",
            type: "multi_select",
            required: true,
            options: SHIFTS,
          },
          {
            id: "total_hours",
            label: "Roughly how many hours total?",
            type: "select",
            required: true,
            options: ["3–5", "6–10", "11–15", "As many as you need"],
          },
        ],
      },
      {
        id: "preferences",
        title: "Preferences",
        fields: [
          {
            id: "areas",
            label: "Where would you like to help?",
            type: "multi_select",
            options: ["Check-in", "Food", "Workshops", "Hardware lab", "Judging logistics", "Wherever needed"],
          },
          {
            id: "why_volunteer",
            label: "Why do you want to help run Cal Hacks?",
            type: "long_text",
            required: true,
            maxLength: 400,
          },
        ],
      },
    ],
  },
};

/** Every field across every section, in order. */
export function fieldsFor(role: ApplicationRole): Field[] {
  return APPLICATION_FORMS[role].sections.flatMap((section) => [...section.fields]);
}

/**
 * The validation schema for one field.
 *
 * `required` is a parameter rather than a wrapper applied afterwards because
 * a required string needs `.min(1)` folded into the same schema — piping a
 * non-empty check into a separately built schema fights Zod's input typing
 * for no benefit.
 */
function fieldSchema(field: Field, required: boolean): z.ZodType {
  switch (field.type) {
    case "long_text": {
      const max = field.maxLength ?? 2000;
      const schema = z.string().max(max, `Keep this under ${max} characters.`);
      return required ? schema.min(1, "This one is required.") : schema;
    }

    case "short_text": {
      const schema = z.string().max(200);
      return required ? schema.min(1, "This one is required.") : schema;
    }

    case "url": {
      // People type "github.com/x" far more often than "https://github.com/x",
      // so the value is normalised on submit rather than rejected here.
      const schema = z.string().max(500);
      return required ? schema.min(1, "This one is required.") : schema;
    }

    case "select": {
      const options = field.options ?? [];
      // Checked against the option list, so a hand-crafted POST cannot store
      // a choice that was never offered on screen.
      const schema = z
        .string()
        .refine((value) => value === "" || options.includes(value), "Choose one of the listed options.");
      return required
        ? schema.refine((value) => value !== "", "This one is required.")
        : schema;
    }

    case "multi_select": {
      const options = field.options ?? [];
      const schema = z.array(z.string().refine((value) => options.includes(value)));
      return required ? schema.min(1, "Choose at least one.") : schema;
    }
  }
}

/**
 * Schema for saving a draft: shape is checked, completeness is not.
 *
 * Autosave fires while somebody is halfway through a sentence, so requiring
 * anything here would mean their work silently failed to save.
 */
export function draftSchema(role: ApplicationRole) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fieldsFor(role)) {
    shape[field.id] = fieldSchema(field, false).optional();
  }
  return z.object(shape);
}

/**
 * Schema for submitting: everything marked required must actually be there.
 *
 * Built from the same field list as the draft schema and the renderer, so a
 * question cannot be required on screen but optional on the server.
 */
export function submitSchema(role: ApplicationRole) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fieldsFor(role)) {
    const schema = fieldSchema(field, field.required ?? false);
    shape[field.id] = field.required ? schema : schema.optional();
  }
  return z.object(shape);
}

/** True when every required field in a section has an answer. */
export function isSectionComplete(section: Section, responses: Record<string, unknown>): boolean {
  return section.fields.every((field) => {
    if (!field.required) return true;
    const value = responses[field.id];
    return Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim() !== "";
  });
}
