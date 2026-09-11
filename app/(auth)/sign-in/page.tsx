import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  // Set by the proxy when it turns away a signed-out visitor, so signing in
  // returns them to the page they actually wanted.
  //
  // Absent means absent. This used to fall back to "/dashboard", which the
  // form then submitted as an explicit destination, so the action could never
  // tell "take me back to where I was" apart from "I just signed in" — and
  // every organizer landed on the applicant dashboard. With nothing here the
  // action picks by role instead.
  const { next } = await searchParams;
  return <SignInForm next={typeof next === "string" ? next : null} />;
}
