/**
 * The four kinds of application the portal accepts.
 *
 * This list is the single source of truth for roles across the app: the
 * Postgres `application_role` enum mirrors it, the landing page renders
 * from it, and the form definitions in `forms.ts` are keyed by it. Adding
 * a fifth role next year means adding it here, adding its questions, and
 * one migration to extend the enum — no new tables, queries or policies.
 */
export const APPLICATION_ROLES = ["hacker", "mentor", "judge", "volunteer"] as const;

export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

/** Narrows an untrusted string — a URL segment, a form field — to a role. */
export function isApplicationRole(value: string): value is ApplicationRole {
  return (APPLICATION_ROLES as readonly string[]).includes(value);
}

type RoleCopy = {
  label: string;
  /** Shown under the heading on the role picker and the landing page. */
  blurb: string;
  /** What signing up actually costs someone in time. */
  commitment: string;
};

export const ROLE_COPY: Record<ApplicationRole, RoleCopy> = {
  hacker: {
    label: "Hacker",
    blurb:
      "Build something over a weekend with a team of up to four. Open to any student, whether this is your first hackathon or your fifteenth.",
    commitment: "Full weekend · Oct 23–25",
  },
  mentor: {
    label: "Mentor",
    blurb:
      "Sit with teams when they get stuck. Bring a stack you know well and the patience to explain it twice.",
    commitment: "Shifts from 4 hours",
  },
  judge: {
    label: "Judge",
    blurb:
      "Meet the teams at the end of the weekend and help decide what stands out. Expect a long afternoon of demos.",
    commitment: "Sunday afternoon",
  },
  volunteer: {
    label: "Volunteer",
    blurb:
      "Run check-in, keep the space alive, and make sure nine hundred people get fed on time. No experience needed.",
    commitment: "Shifts from 3 hours",
  },
};
