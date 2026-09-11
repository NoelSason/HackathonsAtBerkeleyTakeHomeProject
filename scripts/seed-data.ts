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

  { email: "kwame@calhacks.demo", fullName: "Kwame Mensah", school: "Morehouse College" },
  { email: "ingrid@calhacks.demo", fullName: "Ingrid Solberg", school: "University of Washington" },
  { email: "raj@calhacks.demo", fullName: "Raj Patel", school: "UC Berkeley" },
  { email: "chloe@calhacks.demo", fullName: "Chloe Beaumont", school: "McGill University" },
  { email: "omar@calhacks.demo", fullName: "Omar Farouk", school: "UT Austin" },
  { email: "mina@calhacks.demo", fullName: "Mina Park", school: "UC San Diego" },
  { email: "dante@calhacks.demo", fullName: "Dante Russo", school: "Cal Poly SLO" },
  { email: "aisha@calhacks.demo", fullName: "Aisha Rahman", school: "San José State" },
  { email: "felix@calhacks.demo", fullName: "Felix Braun", school: "Georgia Tech" },
  { email: "nadia@calhacks.demo", fullName: "Nadia Petrova", school: "University of Waterloo" },
  { email: "jonah@calhacks.demo", fullName: "Jonah Weiss", school: "UCLA" },
  { email: "priyanka@calhacks.demo", fullName: "Priyanka Iyer", school: "UC Davis" },
  { email: "malik@calhacks.demo", fullName: "Malik Johnson", school: "Howard University" },
  { email: "elena@calhacks.demo", fullName: "Elena Vasquez", school: "Fresno State" },
  { email: "toby@calhacks.demo", fullName: "Toby Fitzgerald", school: "UC Irvine" },
  { email: "sana@calhacks.demo", fullName: "Sana Qureshi", school: "Stanford" },
  { email: "lucas@calhacks.demo", fullName: "Lucas Almeida", school: "UC Santa Cruz" },
  { email: "harper@calhacks.demo", fullName: "Harper Quinn", school: "Northeastern University" },
  { email: "wei@calhacks.demo", fullName: "Wei Zhang", school: "UC Berkeley" },
  { email: "isabel@calhacks.demo", fullName: "Isabel Moreno", school: "San Francisco State" },
  { email: "andre@calhacks.demo", fullName: "André Dubois", school: "McGill University" },
  { email: "keiko@calhacks.demo", fullName: "Keiko Yamamoto", school: "UC Santa Cruz" },
  { email: "samir@calhacks.demo", fullName: "Samir Haddad", school: "UT Austin" },
  { email: "brenna@calhacks.demo", fullName: "Brenna O'Neill", school: "Northeastern University" },
  { email: "victor@calhacks.demo", fullName: "Victor Osei", school: "Morehouse College" },
  { email: "lily@calhacks.demo", fullName: "Lily Nakamura", school: "University of Washington" },
  { email: "gabriel@calhacks.demo", fullName: "Gabriel Santos", school: "San Francisco State" },
  { email: "farah@calhacks.demo", fullName: "Farah Nasser", school: "UCLA" },
  { email: "connor@calhacks.demo", fullName: "Connor Walsh", school: null },
  { email: "zara@calhacks.demo", fullName: "Zara Ahmed", school: null },
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


function mentor(fields: Partial<Record<string, string | string[]>>) {
  return {
    pronouns: "they/them",
    phone: "(415) 555-0110",
    current_role: "Software engineer",
    organization: "",
    years_experience: "3–5",
    areas: ["Developer tools"],
    stack: "",
    shifts: ["Saturday afternoon"],
    presence: "On-site",
    portfolio: "",
    mentoring_approach: "",
    ...fields,
  } as Record<string, string | string[]>;
}

function judge(fields: Partial<Record<string, string | string[]>>) {
  return {
    pronouns: "they/them",
    phone: "(415) 555-0120",
    current_role: "Engineering manager",
    organization: "",
    judging_experience: "Once or twice",
    tracks: ["AI / ML"],
    evaluation_strengths: "",
    portfolio: "",
    sunday_availability: "All afternoon",
    conflicts: "",
    ...fields,
  } as Record<string, string | string[]>;
}

function volunteer(fields: Partial<Record<string, string | string[]>>) {
  return {
    pronouns: "they/them",
    phone: "(415) 555-0130",
    shifts: ["Saturday morning"],
    total_hours: "6–10",
    areas: ["Wherever needed"],
    why_volunteer: "",
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
      portfolio: "https://github.com/adafruit/Adafruit_CircuitPython_ServoKit",
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
      portfolio: "https://github.com/frappe/erpnext",
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
      portfolio: "https://github.com/djrobstep/migra",
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
      // A real public repository, so CalIntelligence has something to
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
      portfolio: "https://github.com/open-spaced-repetition/fsrs4anki",
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
      portfolio: "https://github.com/meshtastic/firmware",
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
      portfolio: "https://github.com/tastejs/todomvc",
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
      portfolio: "https://github.com/actualbudget/actual",
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
      portfolio: "https://github.com/pvlib/pvlib-python",
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
      portfolio: "https://github.com/djrobstep/migra",
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
      portfolio: "https://github.com/scikit-learn/scikit-learn",
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
      portfolio: "https://github.com/astral-sh/ruff",
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

  {
    applicant: "kwame@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 18,
    responses: hacker({
      pronouns: "he/him",
      major: "Computer Science",
      graduation: "2027",
      hackathons_attended: "3–5",
      shipping_comfort: "I ship production code regularly",
      portfolio: "https://github.com/MobilityData/gtfs-realtime-bindings",
      tracks: ["Developer tools", "Civic tech"],
      travel: "Travelling, requesting reimbursement",
      proud_project:
        "A bus-arrival board for my grandmother's church, running on a spare Android tablet in the lobby. The transit agency's feed goes down about twice a week, so most of the work was deciding what to show when you know nothing: last known times, greyed out, with the age of the data in plain words. Nobody has asked me to fix it in a year.",
      why_cal_hacks:
        "I have only ever built things alone or for a grade. I want to find out what I am like on a team that did not pick me.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Thinking about failure states unprompted is the whole job." },
      [REVIEWER]: { score: 4, notes: "Solid. The stale-data handling is more thoughtful than most senior work." },
      [THIRD_REVIEWER]: { score: 3, notes: "Good instincts, small surface area. Want to see something harder." },
    },
  },
  {
    applicant: "ingrid@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 9,
    responses: hacker({
      pronouns: "she/her",
      major: "Bioengineering",
      graduation: "2028",
      hackathons_attended: "1–2",
      shipping_comfort: "I've built projects end to end",
      portfolio: "https://github.com/scikit-image/scikit-image",
      tracks: ["Health", "AI / ML"],
      proud_project:
        "Software that reads gel electrophoresis images and reports band positions, because our lab was doing it by eye and disagreeing with each other. It is a thresholding pipeline, not machine learning, and it agrees with the two most careful people in the lab about 95% of the time. The remaining 5% are the interesting ones and I log every single one.",
      why_cal_hacks:
        "Most of my code is read by four people. I want to build something that a stranger has to use without me standing next to them.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Chose the boring correct method over the impressive one. Very strong." },
      [REVIEWER]: { score: 5, notes: "Logging the disagreements rather than hiding them. Yes." },
      [THIRD_REVIEWER]: { score: 4, notes: "Best of the wet-lab applicants. Still narrow." },
    },
  },
  {
    applicant: "raj@calhacks.demo",
    role: "hacker",
    status: "accepted",
    submittedDaysAgo: 20,
    responses: hacker({
      pronouns: "he/him",
      major: "EECS",
      graduation: "2026",
      hackathons_attended: "6 or more",
      shipping_comfort: "I ship production code regularly",
      portfolio: "https://github.com/tarpas/pytest-testmon",
      tracks: ["Developer tools", "AI / ML"],
      travel: "I live locally",
      proud_project:
        "A test runner that reorders your suite so the tests most likely to fail run first, using the last hundred CI runs. It cut our median time-to-red from eleven minutes to under two. The hard part was convincing people that a non-deterministic test order was fine.",
      why_cal_hacks: "It is my last year and I have never won anything. I would like to try properly once.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Measurable impact and a real social obstacle overcome. Take." },
      [REVIEWER]: { score: 5, notes: "Strongest developer-tools application in the pile." },
      [THIRD_REVIEWER]: { score: 4, notes: "Genuinely good. Motivation essay is one flippant line." },
    },
  },
  {
    applicant: "chloe@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 7,
    responses: hacker({
      pronouns: "she/her",
      major: "Cognitive Science",
      graduation: "2029",
      hackathons_attended: "First-time",
      shipping_comfort: "I can follow a tutorial and adapt it",
      portfolio: "https://github.com/ActivityWatch/activitywatch",
      tracks: ["Health"],
      travel: "Travelling, requesting reimbursement",
      proud_project:
        "A spreadsheet, honestly. I tracked every migraine I had for two years alongside sleep, weather and what I ate, and found two triggers my neurologist had not suggested. I am now trying to turn it into something other people can use, which is why I want to learn to build properly.",
      why_cal_hacks:
        "I do not know how to build software yet. I know how to be rigorous about data. I would like to be on a team that needs the second thing while I learn the first.",
    }),
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Honest about the gap. That is rarer than skill." },
      [REVIEWER]: { score: 4, notes: "Would pair well with a strong builder. Yes with reservations." },
      [THIRD_REVIEWER]: { score: 2, notes: "No demonstrated ability to ship code. Too early." },
    },
  },
  {
    applicant: "omar@calhacks.demo",
    role: "hacker",
    status: "submitted",
    submittedDaysAgo: 1,
    responses: hacker({
      pronouns: "he/him",
      major: "Electrical Engineering",
      graduation: "2027",
      hackathons_attended: "3–5",
      shipping_comfort: "I've built projects end to end",
      portfolio: "https://github.com/TheThingsNetwork/lorawan-stack",
      tracks: ["Hardware", "Climate"],
      travel: "Travelling, no reimbursement needed",
      proud_project:
        "A soil-moisture sensor network for a community garden, twelve nodes on LoRa running off one solar panel. Three nodes died in the first month because I sealed them badly. The current enclosures are ugly and have survived two winters.",
      why_cal_hacks: "Hardware track, and I want to see what people build when the deadline is 36 hours instead of a semester.",
    }),
  },
  {
    applicant: "mina@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 6,
    responses: hacker({
      pronouns: "she/her",
      major: "Data Science",
      graduation: "2028",
      hackathons_attended: "1–2",
      shipping_comfort: "I've built projects end to end",
      portfolio: "https://github.com/City-Bureau/city-scrapers",
      tracks: ["Civic tech", "AI / ML"],
      proud_project:
        "I scraped four years of my city council's agendas and built a search over them, because finding out when your street is being discussed currently requires reading PDFs. Two neighbourhood groups use it. It has no users outside a three-mile radius and that is fine.",
      why_cal_hacks: "I want to work on civic things with people who do not think civic things are boring.",
    }),
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Real users, modest claims. Good." },
      [REVIEWER]: { score: 4, notes: "Civic track needs more of exactly this." },
      [THIRD_REVIEWER]: { score: 3, notes: "Scraping and search. Competent, not ambitious." },
    },
  },
  {
    applicant: "dante@calhacks.demo",
    role: "hacker",
    status: "rejected",
    submittedDaysAgo: 17,
    responses: hacker({
      pronouns: "he/him",
      major: "Business Information Systems",
      graduation: "2027",
      hackathons_attended: "6 or more",
      shipping_comfort: "I ship production code regularly",
      portfolio: "https://github.com/tensorflow/tensorflow",
      tracks: ["Fintech", "AI / ML"],
      proud_project:
        "I have led multiple award-winning teams to victory at premier hackathons across the country, leveraging cutting-edge AI to disrupt legacy industries and deliver transformative outcomes at scale.",
      why_cal_hacks: "Cal Hacks is the premier collegiate hackathon and I want to add it to my track record.",
    }),
    reviews: {
      [DIRECTOR]: { score: 3, notes: "Nothing checkable in either essay. Cannot evaluate." },
      [REVIEWER]: { score: 2, notes: "All claim, no detail. Not one specific thing built." },
      [THIRD_REVIEWER]: { score: 2, notes: "No." },
    },
  },
  {
    applicant: "aisha@calhacks.demo",
    role: "hacker",
    status: "waitlisted",
    submittedDaysAgo: 13,
    responses: hacker({
      pronouns: "she/her",
      major: "Computer Engineering",
      graduation: "2028",
      hackathons_attended: "1–2",
      shipping_comfort: "I can follow a tutorial and adapt it",
      portfolio: "https://github.com/LibreTranslate/LibreTranslate",
      tracks: ["Hardware"],
      travel: "I live locally",
      proud_project:
        "A doorbell that texts my mother in Urdu instead of English, because the off-the-shelf one only spoke English and she stopped using it. It is a Raspberry Pi and a translation API and it works.",
      why_cal_hacks: "I want to build for people who are usually an afterthought, and I need practice.",
    }),
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Small but the motivation is exactly right." },
      [REVIEWER]: { score: 3, notes: "Thin technically. Would take if there is room." },
      [THIRD_REVIEWER]: { score: 3, notes: "Borderline. Agree with waitlist." },
    },
  },
  {
    applicant: "felix@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 11,
    responses: hacker({
      pronouns: "he/him",
      major: "Mathematics",
      graduation: "2026",
      level: "Master's",
      hackathons_attended: "3–5",
      shipping_comfort: "I ship production code regularly",
      portfolio: "https://github.com/scikit-learn/scikit-learn",
      tracks: ["AI / ML", "Developer tools"],
      travel: "Travelling, requesting reimbursement",
      proud_project:
        "I reimplemented a paper's results and found they did not hold. The authors had leaked test data through their normalisation step. I emailed them, they confirmed it, and the arXiv version now has a correction note. My code is not impressive; the bug hunt was the work.",
      why_cal_hacks: "I am better at breaking things than building them and I would like that to be less true.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Reproduced a paper and found a leak. That is real research hygiene." },
      [REVIEWER]: { score: 5, notes: "Best single anecdote in the whole pile." },
      [THIRD_REVIEWER]: { score: 4, notes: "Strong, though he says himself he does not build much." },
    },
  },
  {
    applicant: "nadia@calhacks.demo",
    role: "hacker",
    status: "submitted",
    submittedDaysAgo: 3,
    responses: hacker({
      pronouns: "she/her",
      major: "Computer Science",
      graduation: "2029",
      hackathons_attended: "First-time",
      shipping_comfort: "Still learning the basics",
      portfolio: "https://github.com/observablehq/plot",
      tracks: ["Climate"],
      travel: "Travelling, requesting reimbursement",
      proud_project:
        "I am halfway through a website that shows which recycling actually gets recycled in my province. Most of it does not. I have the data and a very ugly bar chart and no idea how to deploy anything.",
      why_cal_hacks: "I need to be around people who have done this before. I learn fastest by watching.",
    }),
  },
  {
    applicant: "jonah@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 8,
    responses: hacker({
      pronouns: "he/him",
      major: "Music Technology",
      graduation: "2027",
      hackathons_attended: "1–2",
      shipping_comfort: "I've built projects end to end",
      portfolio: "https://github.com/electro-smith/DaisyExamples",
      tracks: ["Hardware", "AI / ML"],
      proud_project:
        "A guitar pedal that listens to what you played eight bars ago and plays it back slightly wrong. It is one microcontroller and a lot of arguing with myself about latency. Two people in my department have bought one off me for parts cost.",
      why_cal_hacks: "Everything I build is for musicians. I want to build something for someone else for once.",
    }),
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Unusual and actually finished. Good." },
      [REVIEWER]: { score: 4, notes: "Latency work is real engineering. Yes." },
      [THIRD_REVIEWER]: { score: 3, notes: "Charming. Not sure it transfers to a team setting." },
    },
  },
  {
    applicant: "priyanka@calhacks.demo",
    role: "hacker",
    status: "accepted",
    submittedDaysAgo: 19,
    responses: hacker({
      pronouns: "she/her",
      major: "Statistics",
      graduation: "2027",
      hackathons_attended: "3–5",
      shipping_comfort: "I ship production code regularly",
      portfolio: "https://github.com/dateutil/dateutil",
      tracks: ["Health", "AI / ML"],
      travel: "I live locally",
      proud_project:
        "A pipeline that takes our hospital partner's messy discharge exports and produces something a statistician can actually use. Ninety percent of the work is the twelve ways a date can be written. It runs nightly and has not needed me in four months.",
      why_cal_hacks: "Cleaning data is the job nobody wants and I am unreasonably good at it. I want to see what I can do with 36 hours and no cleaning to do.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Unglamorous, reliable, self-aware. Take." },
      [REVIEWER]: { score: 4, notes: "Very strong. Would like to see more product instinct." },
      [THIRD_REVIEWER]: { score: 4, notes: "One of the few I would actually argue for." },
    },
  },
  {
    applicant: "malik@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 5,
    responses: hacker({
      pronouns: "he/him",
      major: "Computer Science",
      graduation: "2028",
      hackathons_attended: "1–2",
      shipping_comfort: "I've built projects end to end",
      portfolio: "https://github.com/twilio/twilio-python",
      tracks: ["Civic tech", "Fintech"],
      travel: "Travelling, requesting reimbursement",
      proud_project:
        "A text-message service that tells people how much of their paycheck advance they have already paid back, because the app the lender provides does not say. I built it for my cousin and now about forty people in his building use it. I do not charge and I will not.",
      why_cal_hacks: "I want to work on money software that is on the right side.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Forty real users and a clear ethical line. Strong." },
      [REVIEWER]: { score: 4, notes: "Good. Technical depth unclear from the essay." },
      [THIRD_REVIEWER]: { score: 3, notes: "Motivation is excellent, evidence of engineering is not." },
    },
  },
  {
    applicant: "elena@calhacks.demo",
    role: "hacker",
    status: "submitted",
    submittedDaysAgo: 2,
    responses: hacker({
      pronouns: "she/her",
      major: "Agricultural Engineering",
      graduation: "2028",
      hackathons_attended: "First-time",
      shipping_comfort: "I can follow a tutorial and adapt it",
      portfolio: "https://github.com/OpenSprinkler/OpenSprinkler-Firmware",
      tracks: ["Climate", "Hardware"],
      travel: "Travelling, requesting reimbursement",
      dietary: "Vegetarian",
      proud_project:
        "An irrigation timer that reads the forecast and skips the cycle if rain is likely. My father runs forty acres and was doing this by looking at the sky. It has been wrong twice.",
      why_cal_hacks: "Nobody at my school does this. I want to find out how far behind I am.",
    }),
  },
  {
    applicant: "toby@calhacks.demo",
    role: "hacker",
    status: "rejected",
    submittedDaysAgo: 16,
    responses: hacker({
      pronouns: "he/him",
      major: "Undeclared",
      graduation: "2030 or later",
      hackathons_attended: "First-time",
      shipping_comfort: "Still learning the basics",
      portfolio: "https://github.com/Rapptz/discord.py",
      tracks: ["AI / ML"],
      proud_project: "I made a Discord bot from a YouTube tutorial. It tells jokes.",
      why_cal_hacks: "Free food and swag, and my roommate is going.",
    }),
    reviews: {
      [DIRECTOR]: { score: 3, notes: "At least it is honest. Too early." },
      [REVIEWER]: { score: 2, notes: "No." },
      [THIRD_REVIEWER]: { score: 2, notes: "No." },
    },
  },
  {
    applicant: "sana@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 10,
    responses: hacker({
      pronouns: "she/her",
      major: "Symbolic Systems",
      graduation: "2027",
      hackathons_attended: "3–5",
      shipping_comfort: "I ship production code regularly",
      portfolio: "https://github.com/m-bain/whisperX",
      tracks: ["AI / ML", "Health"],
      travel: "I live locally",
      accessibility: "I have a hearing impairment and would benefit from captions at the opening talks.",
      proud_project:
        "A captioning tool for lab meetings that keeps a per-speaker glossary, because generic speech recognition renders every piece of domain vocabulary as nonsense. Adding the glossary took the word error rate on technical terms from unusable to about one mistake a minute.",
      why_cal_hacks: "Accessibility work is usually done by people who do not need it. I do need it.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Lived expertise plus measured improvement. Yes." },
      [REVIEWER]: { score: 5, notes: "Would put her on any team. Flag the captioning request to ops." },
      [THIRD_REVIEWER]: { score: 4, notes: "Strong. Note the accommodation actually gets arranged." },
    },
  },
  {
    applicant: "lucas@calhacks.demo",
    role: "hacker",
    status: "waitlisted",
    submittedDaysAgo: 14,
    responses: hacker({
      pronouns: "he/him",
      major: "Physics",
      graduation: "2026",
      hackathons_attended: "1–2",
      shipping_comfort: "I've built projects end to end",
      portfolio: "https://github.com/NREL/EnergyPlus",
      tracks: ["Climate"],
      proud_project:
        "A model of how long our building's heating takes to respond to the thermostat, fitted from a winter of logged temperatures. The conclusion was that the thermostat is in the wrong room. Facilities have not moved it.",
      why_cal_hacks: "I would like to build something that someone actually deploys, for once.",
    }),
    reviews: {
      [REVIEWER]: { score: 3, notes: "Good analysis, no software to speak of." },
      [THIRD_REVIEWER]: { score: 3, notes: "Agree. Waitlist." },
    },
  },
  {
    applicant: "harper@calhacks.demo",
    role: "hacker",
    status: "draft",
    responses: hacker({
      pronouns: "they/them",
      major: "Computer Science",
      hackathons_attended: "1–2",
    }),
  },
  {
    applicant: "wei@calhacks.demo",
    role: "hacker",
    status: "under_review",
    submittedDaysAgo: 6,
    responses: hacker({
      pronouns: "he/him",
      major: "EECS",
      graduation: "2029",
      hackathons_attended: "1–2",
      shipping_comfort: "I've built projects end to end",
      portfolio: "https://github.com/astral-sh/ruff",
      tracks: ["Developer tools"],
      travel: "I live locally",
      proud_project:
        "A linter for our student org's shared codebase that only checks the three things we actually argued about in code review. It is forty lines and it ended the arguments.",
      why_cal_hacks: "I want to build something bigger than forty lines.",
    }),
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Understands that the smallest tool that ends the argument is the right one." },
      [THIRD_REVIEWER]: { score: 3, notes: "Fine. Early." },
    },
  },
  {
    applicant: "isabel@calhacks.demo",
    role: "hacker",
    status: "submitted",
    submittedDaysAgo: 1,
    responses: hacker({
      pronouns: "she/her",
      major: "Urban Studies",
      graduation: "2028",
      hackathons_attended: "First-time",
      shipping_comfort: "I can follow a tutorial and adapt it",
      portfolio: "https://github.com/openstreetmap/iD",
      tracks: ["Civic tech"],
      travel: "I live locally",
      proud_project:
        "I mapped every curb cut missing along two bus routes by walking them with a clipboard, then put it in a public map. The city has fixed nine of them.",
      why_cal_hacks: "I did that with a clipboard. I would like to know what I could do with software.",
    }),
  },

  {
    applicant: "andre@calhacks.demo",
    role: "mentor",
    status: "under_review",
    submittedDaysAgo: 15,
    responses: mentor({
      pronouns: "he/him",
      current_role: "Principal engineer",
      organization: "Shopify",
      years_experience: "More than 10",
      areas: ["Developer tools", "Fintech"],
      stack: "Ruby, Rust, Postgres",
      shifts: ["Friday evening", "Saturday morning", "Saturday afternoon"],
      presence: "On-site",
      portfolio: "https://github.com/meshtastic/firmware",
      mentoring_approach:
        "I ask to see the error message. Not a description of it, the message. About a third of the time we are done at that point, and the team learns to read the thing in front of them.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Available Friday night, which is when we are thinnest. Yes." },
      [REVIEWER]: { score: 4, notes: "Good approach, strong availability." },
    },
  },
  {
    applicant: "keiko@calhacks.demo",
    role: "mentor",
    status: "accepted",
    submittedDaysAgo: 21,
    responses: mentor({
      pronouns: "she/her",
      current_role: "Infrastructure engineer",
      organization: "Cloudflare",
      years_experience: "6–10",
      areas: ["Developer tools", "Climate"],
      stack: "Go, Kubernetes, Terraform",
      shifts: ["Saturday afternoon", "Saturday night", "Sunday morning"],
      presence: "On-site",
      mentoring_approach:
        "Saturday night is when teams make their worst architectural decisions because they are tired. I try to be the person who asks whether the thing they are about to rewrite actually needs rewriting.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Saturday night coverage from someone who understands why that shift matters." },
      [REVIEWER]: { score: 5, notes: "Take immediately." },
      [THIRD_REVIEWER]: { score: 4, notes: "Strong. Agree." },
    },
  },
  {
    applicant: "samir@calhacks.demo",
    role: "mentor",
    status: "under_review",
    submittedDaysAgo: 12,
    responses: mentor({
      pronouns: "he/him",
      current_role: "Founding engineer",
      organization: "a seed-stage health startup",
      years_experience: "6–10",
      areas: ["Health", "AI / ML"],
      stack: "TypeScript, Python, FHIR",
      shifts: ["Saturday morning", "Sunday afternoon"],
      presence: "Either",
      mentoring_approach:
        "Health data has rules that are not obvious and teams walk into them constantly. I mostly stop people from building something they would have to throw away.",
    }),
    reviews: {
      [THIRD_REVIEWER]: { score: 3, notes: "Useful specialism. Availability is thin." },
    },
  },
  {
    applicant: "brenna@calhacks.demo",
    role: "mentor",
    status: "submitted",
    submittedDaysAgo: 2,
    responses: mentor({
      pronouns: "she/her",
      current_role: "Design engineer",
      organization: "Figma",
      years_experience: "3–5",
      areas: ["Developer tools", "Civic tech"],
      stack: "TypeScript, React, WebGL",
      shifts: ["Saturday afternoon", "Sunday morning"],
      presence: "On-site",
      mentoring_approach:
        "Most demos fail because nobody looked at the thing on a projector. I make teams do that on Saturday afternoon, not Sunday at ten.",
    }),
  },
  {
    applicant: "victor@calhacks.demo",
    role: "mentor",
    status: "waitlisted",
    submittedDaysAgo: 18,
    responses: mentor({
      pronouns: "he/him",
      current_role: "Senior data engineer",
      organization: "Netflix",
      years_experience: "6–10",
      areas: ["AI / ML"],
      stack: "Scala, Spark, Airflow",
      shifts: ["Sunday morning"],
      presence: "Remote",
      mentoring_approach: "I am good at telling people their data pipeline does not need to be a data pipeline.",
    }),
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Would love him, but one remote shift on Sunday is not much use." },
      [THIRD_REVIEWER]: { score: 2, notes: "Availability makes this close to pointless." },
    },
  },
  {
    applicant: "lily@calhacks.demo",
    role: "mentor",
    status: "under_review",
    submittedDaysAgo: 9,
    responses: mentor({
      pronouns: "she/her",
      current_role: "Embedded systems engineer",
      organization: "Zipline",
      years_experience: "3–5",
      areas: ["Hardware", "Climate"],
      stack: "C, Rust, Zephyr",
      shifts: ["Friday evening", "Saturday morning", "Saturday afternoon", "Sunday morning"],
      presence: "On-site",
      mentoring_approach:
        "Hardware teams lose Saturday to a wiring fault they could have found in ten minutes with a multimeter. I bring three multimeters.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "The hardware lab has had nobody for two years. Yes." },
      [REVIEWER]: { score: 5, notes: "Brings her own multimeters. Take." },
    },
  },
  {
    applicant: "felix@calhacks.demo",
    role: "mentor",
    status: "submitted",
    submittedDaysAgo: 4,
    responses: mentor({
      pronouns: "he/him",
      current_role: "Graduate researcher",
      organization: "Georgia Tech",
      years_experience: "1–2",
      areas: ["AI / ML"],
      stack: "Python, PyTorch",
      shifts: ["Saturday night"],
      presence: "On-site",
      mentoring_approach: "I can tell someone quickly whether their evaluation is measuring what they think it is measuring.",
    }),
  },
  {
    applicant: "raj@calhacks.demo",
    role: "mentor",
    status: "under_review",
    submittedDaysAgo: 8,
    responses: mentor({
      pronouns: "he/him",
      current_role: "Student, part-time SRE",
      organization: "UC Berkeley",
      years_experience: "1–2",
      areas: ["Developer tools"],
      stack: "Python, Bash, CI systems",
      shifts: ["Saturday morning", "Saturday afternoon"],
      presence: "On-site",
      mentoring_approach: "I have unstuck about fifty people from broken CI. It is nearly always the same five things.",
    }),
    reviews: {
      [REVIEWER]: { score: 4, notes: "Junior but the specialism is genuinely useful at 2am." },
    },
  },
  {
    applicant: "priyanka@calhacks.demo",
    role: "mentor",
    status: "draft",
    responses: mentor({
      pronouns: "she/her",
      current_role: "Data engineer",
      organization: "UC Davis Health",
    }),
  },

  {
    applicant: "farah@calhacks.demo",
    role: "judge",
    status: "under_review",
    submittedDaysAgo: 16,
    responses: judge({
      pronouns: "she/her",
      current_role: "VP of Engineering",
      organization: "Duolingo",
      judging_experience: "Regularly",
      tracks: ["AI / ML", "Developer tools"],
      evaluation_strengths:
        "I am good at spotting the demo that only works on the presenter's laptop with one specific input. I ask to type something myself.",
      portfolio: "https://github.com/dateutil/dateutil",
      sunday_availability: "All afternoon",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Experienced, full availability, and asks to type. Yes." },
      [REVIEWER]: { score: 5, notes: "Best judge application we have." },
    },
  },
  {
    applicant: "connor@calhacks.demo",
    role: "judge",
    status: "accepted",
    submittedDaysAgo: 20,
    responses: judge({
      pronouns: "he/him",
      current_role: "Partner",
      organization: "an early-stage fund",
      judging_experience: "Several times",
      tracks: ["Fintech", "Civic tech"],
      evaluation_strengths:
        "Whether the team can say who this is for in one sentence without using the word platform.",
      sunday_availability: "All afternoon",
      conflicts: "I would recuse from anything by a team I have taken a meeting with.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Declared the conflict unprompted." },
      [THIRD_REVIEWER]: { score: 4, notes: "Fine. Watch the investor-pitch framing does not skew scoring." },
    },
  },
  {
    applicant: "zara@calhacks.demo",
    role: "judge",
    status: "under_review",
    submittedDaysAgo: 11,
    responses: judge({
      pronouns: "she/her",
      current_role: "Accessibility researcher",
      organization: "an independent consultancy",
      judging_experience: "Once or twice",
      tracks: ["Health", "Civic tech"],
      evaluation_strengths:
        "I check whether the thing works with a keyboard and a screen reader. Almost nothing does, and teams that thought about it stand out immediately.",
      sunday_availability: "Late afternoon only",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Nobody else is checking this. Worth working around the availability." },
      [REVIEWER]: { score: 4, notes: "Strong, half availability." },
    },
  },
  {
    applicant: "gabriel@calhacks.demo",
    role: "judge",
    status: "submitted",
    submittedDaysAgo: 3,
    responses: judge({
      pronouns: "he/him",
      current_role: "High school CS teacher",
      organization: "Mission High School",
      judging_experience: "First time",
      tracks: ["Civic tech", "Climate"],
      evaluation_strengths:
        "I spend all day working out whether someone understands what they built or is repeating it. That is most of judging.",
      sunday_availability: "All afternoon",
    }),
  },
  {
    applicant: "sofia@calhacks.demo",
    role: "judge",
    status: "rejected",
    submittedDaysAgo: 17,
    responses: judge({
      pronouns: "she/her",
      current_role: "Undergraduate",
      organization: "UC Davis",
      judging_experience: "First time",
      tracks: ["AI / ML"],
      evaluation_strengths: "I would look for the most technically impressive project.",
      sunday_availability: "Early afternoon only",
    }),
    reviews: {
      [DIRECTOR]: { score: 3, notes: "Better suited to volunteering, which she also applied for." },
      [REVIEWER]: { score: 2, notes: "Judges should not be current undergraduates in the same pool." },
    },
  },
  {
    applicant: "ingrid@calhacks.demo",
    role: "judge",
    status: "under_review",
    submittedDaysAgo: 7,
    responses: judge({
      pronouns: "she/her",
      current_role: "Research assistant",
      organization: "University of Washington",
      judging_experience: "Once or twice",
      tracks: ["Health"],
      evaluation_strengths: "Whether a health claim in a demo is something the data could actually support.",
      sunday_availability: "All afternoon",
    }),
    reviews: {
      [THIRD_REVIEWER]: { score: 3, notes: "Also applied as a hacker. Pick one." },
    },
  },
  {
    applicant: "diego@calhacks.demo",
    role: "judge",
    status: "waitlisted",
    submittedDaysAgo: 13,
    responses: judge({
      pronouns: "he/him",
      current_role: "Software engineer",
      organization: "San José State",
      judging_experience: "Once or twice",
      tracks: ["Developer tools", "Fintech"],
      evaluation_strengths: "I can tell in about ninety seconds whether a repository was written this weekend.",
      sunday_availability: "Late afternoon only",
      conflicts: "I am also an accepted hacker, so I would recuse from everything in my own track.",
    }),
    reviews: {
      [DIRECTOR]: { score: 3, notes: "Cannot judge and compete. Waitlist pending his decision." },
      [REVIEWER]: { score: 3, notes: "Agree, conflict is disqualifying as it stands." },
    },
  },
  {
    applicant: "noah@calhacks.demo",
    role: "judge",
    status: "draft",
    responses: judge({
      pronouns: "he/him",
      current_role: "PhD student",
      organization: "UC San Diego",
    }),
  },

  {
    applicant: "toby@calhacks.demo",
    role: "volunteer",
    status: "accepted",
    submittedDaysAgo: 12,
    responses: volunteer({
      pronouns: "he/him",
      shifts: ["Friday evening", "Saturday morning", "Saturday night"],
      total_hours: "As many as you need",
      areas: ["Check-in", "Food", "Wherever needed"],
      why_volunteer:
        "I applied as a hacker too and I know I am not ready. I would still rather be there. I am good at carrying things and staying cheerful at 3am.",
    }),
    reviews: {
      [REVIEWER]: { score: 5, notes: "Exactly the attitude. Take." },
    },
  },
  {
    applicant: "chloe@calhacks.demo",
    role: "volunteer",
    status: "under_review",
    submittedDaysAgo: 8,
    responses: volunteer({
      pronouns: "she/her",
      shifts: ["Saturday afternoon", "Sunday afternoon"],
      total_hours: "6–10",
      areas: ["Workshops", "Judging logistics"],
      why_volunteer: "I want to see how the thing is run before I try to compete in it.",
    }),
    reviews: {
      [DIRECTOR]: { score: 4, notes: "Fine. Judging logistics needs bodies." },
    },
  },
  {
    applicant: "elena@calhacks.demo",
    role: "volunteer",
    status: "submitted",
    submittedDaysAgo: 2,
    responses: volunteer({
      pronouns: "she/her",
      shifts: ["Saturday morning", "Saturday afternoon"],
      total_hours: "6–10",
      areas: ["Food"],
      why_volunteer: "I have fed a hundred people off one propane burner. Nine hundred with a real kitchen sounds easy.",
    }),
  },
  {
    applicant: "nadia@calhacks.demo",
    role: "volunteer",
    status: "under_review",
    submittedDaysAgo: 5,
    responses: volunteer({
      pronouns: "she/her",
      shifts: ["Sunday morning", "Sunday afternoon"],
      total_hours: "3–5",
      areas: ["Check-in"],
      why_volunteer: "Sunday is when everyone is exhausted and nobody signs up. I will take Sunday.",
    }),
    reviews: {
      [THIRD_REVIEWER]: { score: 4, notes: "Volunteering for the shift nobody wants. Rare." },
    },
  },
  {
    applicant: "lucas@calhacks.demo",
    role: "volunteer",
    status: "waitlisted",
    submittedDaysAgo: 15,
    responses: volunteer({
      pronouns: "he/him",
      shifts: ["Saturday afternoon"],
      total_hours: "3–5",
      areas: ["Hardware lab"],
      why_volunteer: "I know my way around a soldering iron and the hardware lab always needs someone who does.",
    }),
    reviews: {
      [REVIEWER]: { score: 3, notes: "Useful skill, very limited hours." },
    },
  },
  {
    applicant: "wei@calhacks.demo",
    role: "volunteer",
    status: "submitted",
    submittedDaysAgo: 1,
    responses: volunteer({
      pronouns: "he/him",
      shifts: ["Friday evening"],
      total_hours: "3–5",
      areas: ["Check-in"],
      why_volunteer: "Friday check-in only, because I am hacking the rest of the weekend.",
    }),
  },
  {
    applicant: "aisha@calhacks.demo",
    role: "volunteer",
    status: "under_review",
    submittedDaysAgo: 10,
    responses: volunteer({
      pronouns: "she/her",
      shifts: ["Saturday morning", "Saturday afternoon", "Sunday morning"],
      total_hours: "11–15",
      areas: ["Workshops", "Wherever needed"],
      why_volunteer:
        "I speak Urdu and Punjabi and last year I watched two people's parents get lost trying to drop them off. I would like to be findable at the door.",
    }),
    reviews: {
      [DIRECTOR]: { score: 5, notes: "Thought about a problem nobody on the team had noticed." },
    },
  },
  {
    applicant: "isabel@calhacks.demo",
    role: "volunteer",
    status: "accepted",
    submittedDaysAgo: 14,
    responses: volunteer({
      pronouns: "she/her",
      shifts: ["Saturday morning", "Saturday afternoon", "Saturday night", "Sunday morning"],
      total_hours: "As many as you need",
      areas: ["Wherever needed"],
      why_volunteer: "I like events. I will do whatever is least popular on the sign-up sheet.",
    }),
    reviews: {
      [REVIEWER]: { score: 5, notes: "Four shifts and no preferences. Take." },
    },
  },
  {
    applicant: "harper@calhacks.demo",
    role: "volunteer",
    status: "draft",
    responses: volunteer({
      pronouns: "they/them",
      shifts: ["Sunday afternoon"],
    }),
  },
];
