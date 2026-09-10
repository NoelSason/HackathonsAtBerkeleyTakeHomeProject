"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthState } from "@/lib/auth-form-state";

/** Only ever redirect within this app, never to a host an attacker supplied. */
function safeNext(value: FormDataEntryValue | null): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

/*
 * Compares the submitted organizer code against the configured one without
 * leaking how much of it was right.
 *
 * A plain `===` on strings short-circuits at the first differing character,
 * so response time reveals the length of the matching prefix. Hashing both
 * sides first means the comparison always runs over 32 bytes, which also
 * hides the length of the real code — something a raw timingSafeEqual cannot
 * do, since it throws outright when the two buffers differ in size.
 */
function codeMatches(supplied: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(supplied), digest(expected));
}

const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, notice: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately vague. Saying "no account with that email" would turn this
    // form into a way to test which addresses have applied.
    return { error: "That email and password do not match an account.", notice: null };
  }

  redirect(safeNext(formData.get("next")));
}

const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "Tell us your name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  school: z.string().trim().optional(),
  organizer_code: z.string().trim().optional(),
});

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    school: formData.get("school"),
    organizer_code: formData.get("organizer_code"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, notice: null };
  }

  const { full_name, email, password, school, organizer_code } = parsed.data;
  const wantsOrganizer = Boolean(organizer_code);

  // Checked before the account is created, so a mistyped code does not leave
  // a half-finished user behind that the person then cannot re-register with.
  if (wantsOrganizer && !codeMatches(organizer_code ?? "", process.env.ORGANIZER_SIGNUP_CODE)) {
    return { error: "That organizer code is not right.", notice: null };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user trigger to populate the profile row. Only
    // non-privileged fields belong here: this bag comes from the browser, so
    // anything security-relevant read from it would be self-assigned.
    options: { data: { full_name, school: school ?? "" } },
  });

  if (error) {
    return { error: error.message, notice: null };
  }

  if (data.user && wantsOrganizer) {
    // Requires the service role key, because the column grants deliberately
    // stop `authenticated` writing staff_role at all — including their own.
    const admin = createAdminClient();
    const { error: grantError } = await admin
      .from("profiles")
      .update({ staff_role: "reviewer" })
      .eq("id", data.user.id);

    if (grantError) {
      return { error: "Account created, but organizer access failed. Ask an organizer.", notice: null };
    }
  }

  // No session means the project still has email confirmation switched on.
  // Sending them to the dashboard would just bounce them back to sign-in.
  if (!data.session) {
    return {
      error: null,
      notice: "Check your email to confirm your address, then sign in.",
    };
  }

  redirect(wantsOrganizer ? "/organizer/applications" : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
