import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  // Set by the proxy when it turns away a signed-out visitor, so signing in
  // returns them to the page they actually wanted.
  const { next } = await searchParams;
  return <SignInForm next={typeof next === "string" ? next : "/dashboard"} />;
}
