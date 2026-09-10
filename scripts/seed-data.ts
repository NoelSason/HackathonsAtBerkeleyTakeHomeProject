import type { ApplicationRole } from "../lib/applications/roles.ts";
import type { Database } from "../lib/database.types.ts";

type Status = Database["public"]["Enums"]["application_status"];
type StaffRole = Database["public"]["Enums"]["staff_role"];

export type SeedPerson = {
  email: string;
  fullName: string;
  school: string | null;
  staffRole?: StaffRole;
};

export type SeedApplication = {
  applicant: string;
  role: ApplicationRole;
  status: Status;
  /** Days before now that it was submitted. Ignored for drafts. */
  submittedDaysAgo?: number;
  responses: Record<string, string | string[]>;
  /** Scores keyed by reviewer email. */
  reviews?: Record<string, { score: number; notes: string }>;
};

export const DIRECTOR = "director@calhacks.demo";
export const REVIEWER = "reviewer@calhacks.demo";
export const APPLICANT = "hacker@calhacks.demo";
const THIRD_REVIEWER = "mei@calhacks.demo";

/*
 * Three reviewers with deliberately different habits.
 *
 * Jordan is generous and rarely goes below four. Mei is hard to impress and
 * rarely goes above three. Sam sits in the middle. That spread is the whole
 * reason the calibrated score exists, and seeding it flat would make the
 * feature look like a decoration.
 */
export const PEOPLE: SeedPerson[] = [
  { email: DIRECTOR, fullName: "Jordan Wu", school: "UC Berkeley", staffRole: "director" },
  { email: REVIEWER, fullName: "Sam Torres", school: "UC Berkeley", staffRole: "reviewer" },
  { email: THIRD_REVIEWER, fullName: "Mei Lin", school: "UC Berkeley", staffRole: "reviewer" },

  { email: APPLICANT, fullName: "Priya Raman", school: "UC Berkeley" },
  { email: "amara@calhacks.demo", fullName: "Amara Okafor", school: "UC Berkeley" },
  { email: "diego@calhacks.demo", fullName: "Diego Fernández", school: "San José State" },
  { email: "hannah@calhacks.demo", fullName: "Hannah Cho", school: "UCLA" },
  { email: "marcus@calhacks.demo", fullName: "Marcus Bell", school: "Howard University" },
  { email: "sofia@calhacks.demo", fullName: "Sofia Nguyen", school: "UC Davis" },
  { email: "ethan@calhacks.demo", fullName: "Ethan Kowalski", school: "University of Waterloo" },
  { email: "leila@calhacks.demo", fullName: "Leila Haddad", school: "Stanford" },
  { email: "tomas@calhacks.demo", fullName: "Tomás Rivera", school: "Cal Poly SLO" },
  { email: "grace@calhacks.demo", fullName: "Grace Adeyemi", school: "Georgia Tech" },
  { email: "noah@calhacks.demo", fullName: "Noah Lindqvist", school: "UC San Diego" },
  { email: "yuki@calhacks.demo", fullName: "Yuki Tanaka", school: "UC Irvine" },
  { email: "rosa@calhacks.demo", fullName: "Rosa Delgado", school: "Fresno State" },
];

function hacker(fields: Partial<Record<string, string | string[]>>) {
  return {
    pronouns: "they/them",
    phone: "(510) 555-0142",
    level: "Undergraduate",
    graduation: "2028",
    major: "EECS",
    hackathons_attended: "1–2",
    shipping_comfort: "I've built projects end to end",
    portfolio: "",
    tracks: ["AI / ML"],
    proud_project: "",
    why_cal_hacks: "",
    travel: "I live locally",
    dietary: "",
    accessibility: "",
    ...fields,
  } as Record<string, string | string[]>;
}

export const APPLICATIONS: SeedApplication[] = [
  {
    applicant: "amara@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 12,
    responses: hacker({
      pronouns: "she/her",
      major: "EECS",
      hackathons_attended: "3–5",
      shipping_comfort: "I ship production code regularly",
      portfolio: "https://github.com/amaraok",
      tracks: ["AI / ML", "Health"],
      proud_project:
        "My grandmother's arthritis makes pill bottles hard to open, so I built her a dispenser out of a Raspberry Pi, a servo, and a lot of hot glue. The first version jammed constantly. Fixing it taught me more about tolerances and failure modes than any class: I redesigned the carousel three times, added a load cell to verify a pill actually dropped, and wrote a text-message fallback for when it doesn't. She has used it every day for eight months.",
      why_cal_hacks:
        "I came to Cal Hacks 11.0 as a freshman and shipped nothing. Our team overscoped and I spent Saturday debugging a build system. I have been deliberate since then: smaller scope, working demo by hour 24, polish after. I want to come back and do it right.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Rare combination of humility and rigor. The load-cell detail is exactly the instinct we want." },
      [REVIEWER]: { score: 5, notes: "Learned from a failed first attempt and came back with a plan. Strong yes." },
      [THIRD_REVIEWER]: { score: 4, notes: "Good essays. Portfolio is mostly class projects, would like one more independent build." },
    },
  },
  {
    applicant: "rosa@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 4,
    responses: hacker({
      pronouns: "she/her",
      major: "Business Administration",
      graduation: "2029",
      hackathons_attended: "First-time",
      shipping_comfort: "I can follow a tutorial and adapt it",
      tracks: ["Civic tech"],
      travel: "Travelling, requesting reimbursement",
      proud_project:
        "I taught myself Python over the summer to automate my family's restaurant inventory. We were throwing away produce every week because ordering was guesswork. My script reads the POS export every night and flags what to order. It is 400 lines and ugly, but food waste is down about 30% and my dad checks it before every supplier call. I have never worked with anyone else on code and I want to learn what that is like.",
      why_cal_hacks:
        "Honestly, because I don't know anyone who codes. My school doesn't have a CS club. I want 36 hours around people who are better than me.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Self-taught, real users, real constraint. Exactly who blind review exists for." },
    },
  },
  {
    applicant: "diego@calhacks.demo",
    role: "hacker",
    status: "accepted",
    submittedDaysAgo: 15,
    responses: hacker({
      pronouns: "he/him",
      major: "Software Engineering",
      graduation: "2027",
      hackathons_attended: "6 or more",
      shipping_comfort: "I ship production code regularly",
      portfolio: "https://github.com/dfernandez",
      tracks: ["Developer tools", "Fintech"],
      travel: "Travelling, no reimbursement needed",
      proud_project:
        "A CLI that diffs Postgres schemas across environments and prints a migration plan. I wrote it because our team kept discovering drift during deploys. It has 90 stars and, more usefully, three coworkers who use it daily and file real bugs.",
      why_cal_hacks:
        "I want to build something with people I have not worked with before. My last four projects were solo, and I can feel that showing up in how I write code.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Strong builder. Would take on any team." },
      [REVIEWER]: { score: 4, notes: "Clearly capable. Essay is a little thin on motivation." },
      [THIRD_REVIEWER]: { score: 3, notes: "Competent but the project is incremental tooling, not a leap." },
    },
  },
  {
    applicant: APPLICANT,
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 9,
    responses: hacker({
      pronouns: "she/her",
      major: "Data Science",
      hackathons_attended: "1–2",
      // A real public repository, so the reading aid has something to
      // actually compare the essay against during a demo. Everything else
      // about this applicant is invented.
      portfolio: "https://github.com/NoelSason/scv-sarigama-checkin",
      tracks: ["Civic tech", "AI / ML"],
      proud_project:
        "I built the check-in system our cultural association used for its Onam event last year. Before that, three volunteers worked a paper list at the door and the queue backed up past the car park. I wrote a web app where a volunteer searches a name, taps once, and the count updates for everyone on shift at the same time. The hard part was not the code, it was that the venue wifi kept dropping, so I had to make the thing survive going offline mid-shift and reconcile afterwards without double-counting anyone.",
      why_cal_hacks:
        "I want to work on something civic with people who care about it. Also I have never shipped anything with a real backend and I would like to stop avoiding that.",
    }),
    reviews: {
      [REVIEWER]: { score: 4, notes: "The correction model shows real curiosity. Would like to see the code." },
      [THIRD_REVIEWER]: { score: 3, notes: "Solid but not distinctive. Middle of the pile for me." },
    },
  },
  {
    applicant: "hannah@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 7,
    responses: hacker({
      pronouns: "she/her",
      major: "Cognitive Science",
      graduation: "2027",
      hackathons_attended: "3–5",
      tracks: ["Health", "AI / ML"],
      proud_project:
        "A study tool that turns lecture recordings into spaced-repetition cards. The hard part was segmentation: naive sentence splitting produced useless cards, so I trained a small classifier on my own annotations of what makes a testable claim.",
      why_cal_hacks: "I want to find collaborators who are as interested in learning science as they are in the model.",
    }),
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Thoughtful about the problem, not just the tech." },
      [THIRD_REVIEWER]: { score: 3, notes: "Fine. The classifier claim is unsubstantiated." },
    },
  },
  {
    applicant: "ethan@calhacks.demo",
    role: "hacker",
    status: "submitted",
    submittedDaysAgo: 2,
    responses: hacker({
      pronouns: "he/him",
      major: "Mechatronics",
      graduation: "2026",
      hackathons_attended: "3–5",
      tracks: ["Hardware", "Climate"],
      travel: "Travelling, requesting reimbursement",
      proud_project:
        "A soil moisture sensor network for a campus farm, solar powered, LoRa backhaul. Kept failing in the rain until I stopped trusting the enclosure spec and potted the boards myself.",
      why_cal_hacks: "Hardware tracks are rare and this one has an actual lab.",
    }),
  },
  {
    applicant: "grace@calhacks.demo",
    role: "hacker",
    status: "rejected",
    submittedDaysAgo: 18,
    responses: hacker({
      pronouns: "she/her",
      major: "Computer Science",
      graduation: "2029",
      hackathons_attended: "First-time",
      shipping_comfort: "Still learning the basics",
      tracks: ["AI / ML"],
      proud_project: "I built a to-do list app in React following a tutorial. I want to learn more.",
      why_cal_hacks: "It seems like a good opportunity and it would look good on my resume.",
    }),
    reviews: {
      [DIRECTOR]: { score: 3, notes: "Enthusiasm is real but the essays say very little." },
      [REVIEWER]: { score: 2, notes: "Nothing specific to go on here." },
      [THIRD_REVIEWER]: { score: 1, notes: "Tutorial project, generic motivation. No." },
    },
  },
  {
    applicant: "tomas@calhacks.demo",
    role: "hacker",
    status: "submitted",
    submittedDaysAgo: 1,
    responses: hacker({
      pronouns: "he/him",
      major: "Computer Engineering",
      graduation: "2028",
      tracks: ["Fintech"],
      proud_project:
        "A budgeting tool for people paid in cash. Most apps assume a bank feed; my family's does not have one, so the whole model is manual entry that takes under five seconds.",
      why_cal_hacks: "I want feedback from people who will tell me when an idea is bad.",
    }),
  },
  {
    applicant: "yuki@calhacks.demo",
    role: "hacker",
    status: "waitlisted",
    submittedDaysAgo: 11,
    responses: hacker({
      pronouns: "they/them",
      major: "Applied Math",
      graduation: "2027",
      hackathons_attended: "1–2",
      tracks: ["Climate"],
      proud_project:
        "A simulation of rooftop solar payback under different tariff structures. I learned more about utility billing than about code.",
      why_cal_hacks: "The climate track, and I would like to work with someone who can build a frontend.",
    }),
    reviews: {
      [REVIEWER]: { score: 3, notes: "Interesting angle, unclear technical depth." },
      [THIRD_REVIEWER]: { score: 3, notes: "Borderline. Would not fight for it either way." },
    },
  },

  {
    applicant: "marcus@calhacks.demo",
    role: "mentor",
    status: "under_review",
    submittedDaysAgo: 16,
    responses: {
      pronouns: "he/him",
      phone: "(202) 555-0117",
      current_role: "Staff engineer",
      organization: "Stripe",
      years_experience: "More than 10",
      areas: ["Fintech", "Developer tools"],
      stack: "Go, Postgres, Kafka",
      shifts: ["Saturday morning", "Saturday afternoon", "Sunday morning"],
      presence: "On-site",
      mentoring_approach:
        "First I make them explain what they think is happening, out loud, because half the time they find it themselves. If that fails I ask what they have already ruled out. I try very hard not to touch the keyboard.",
    },
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Ten years and the right instincts about not taking over. Yes." },
      [REVIEWER]: { score: 4, notes: "Strong. Availability is good too." },
    },
  },
  {
    applicant: "noah@calhacks.demo",
    role: "mentor",
    status: "submitted",
    submittedDaysAgo: 2,
    responses: {
      pronouns: "he/him",
      phone: "(858) 555-0193",
      current_role: "PhD student",
      organization: "UC San Diego",
      years_experience: "3–5",
      areas: ["AI / ML", "Health"],
      stack: "Python, PyTorch, JAX",
      shifts: ["Saturday night", "Sunday morning"],
      presence: "Either",
      mentoring_approach:
        "Ask what they are actually trying to show in the demo, then cut everything that does not serve it. Most stuck teams are stuck because they are building something they do not need.",
    },
  },

  {
    applicant: "leila@calhacks.demo",
    role: "judge",
    status: "waitlisted",
    submittedDaysAgo: 14,
    responses: {
      pronouns: "she/her",
      phone: "(650) 555-0164",
      current_role: "Product lead",
      organization: "Stanford Medicine",
      judging_experience: "Several times",
      tracks: ["Health", "AI / ML"],
      evaluation_strengths:
        "Whether the team understood the problem well enough to know what they left out. A narrow thing that works beats a broad thing that demos.",
      sunday_availability: "Early afternoon only",
      conflicts: "I would recuse from anything involving Stanford Medicine data.",
    },
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Good judge, but only half the afternoon." },
      [THIRD_REVIEWER]: { score: 3, notes: "Availability is the problem, not the person." },
    },
  },

  {
    applicant: "sofia@calhacks.demo",
    role: "volunteer",
    status: "accepted",
    submittedDaysAgo: 10,
    responses: {
      pronouns: "she/her",
      phone: "(530) 555-0148",
      shifts: ["Friday evening", "Saturday morning", "Sunday afternoon"],
      total_hours: "11–15",
      areas: ["Check-in", "Food", "Wherever needed"],
      why_volunteer:
        "I went last year as a hacker and the check-in line was the first thing that made it feel real. I would like to be the person who does that for someone else.",
    },
    reviews: {
      [REVIEWER]: { score: 5, notes: "Wants to do the unglamorous shifts. Take immediately." },
    },
  },
  {
    applicant: "hannah@calhacks.demo",
    role: "volunteer",
    status: "draft",
    responses: {
      pronouns: "she/her",
      shifts: ["Saturday afternoon"],
    },
  },
  {
    applicant: APPLICANT,
    role: "volunteer",
    status: "draft",
    responses: {
      pronouns: "she/her",
      phone: "(510) 555-0142",
    },
  },
];
