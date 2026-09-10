/**
 * Accounts created by the seed script and offered on the sign-in page.
 *
 * A reviewer opening this portal cold should be able to see both sides of it
 * without registering, and without being told which checkbox in Supabase to
 * tick. Publishing the passwords is the point: these three accounts hold
 * nothing but invented applications.
 *
 * Shared between the seed script and the sign-in page so the credentials on
 * screen cannot drift from the ones that actually exist.
 */
export const DEMO_PASSWORD = "calhacks2026";

export type DemoAccount = {
  label: string;
  email: string;
  description: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Applicant",
    email: "hacker@calhacks.demo",
    description: "Has a submitted hacker application and a volunteer draft",
  },
  {
    label: "Reviewer",
    email: "reviewer@calhacks.demo",
    description: "Can read and grade applications, but not decide them",
  },
  {
    label: "Director",
    email: "director@calhacks.demo",
    description: "Can also accept, waitlist and reject",
  },
];
