"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthState } from "@/lib/auth-form-state";

/**
 * The path the proxy remembered, if it is safe to send somebody to.
 *
 * Only ever within this app: a `next` beginning `//` is a protocol-relative
 * URL and would take them to another host entirely. Returns null when there
 * is nothing usable, so the caller picks a destination by role instead.
 */
function safeNext(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : null;
}

/**
 * Where somebody lands when they have not asked for anywhere in particular.
 *
 * An organizer signing in wants the applications pile, not their own empty
 * applicant dashboard. Sign-up has always routed by role; sign-in sent
 * everyone to /dashboard, which was invisible only while a bug there showed
 * organizers the whole pile anyway.
 */
function homeFor(staffRole: string | null): string {
  return staffRole === null ? "/dashboard" : "/organizer/applications";
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
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately vague. Saying "no account with that email" would turn this
    // form into a way to test which addresses have applied.
    return { error: "That email and password do not match an account.", notice: null };
  }

  // An explicit destination wins, so /sign-in?next=/organizer/analytics still
  // lands where the proxy intended. Otherwise it depends on who signed in.
  const next = safeNext(formData.get("next"));
  if (next) redirect(next);

  const { data: profile } = await supabase
    .from("profiles")
    .select("staff_role")
    .eq("id", data.user.id)
    .single();

  redirect(homeFor(profile?.staff_role ?? null));
}

/*
 * Turns a Supabase auth failure into copy written for the person reading it.
 *
 * The provider's own strings leak out of the product otherwise: "User already
 * registered" is the library's wording, not ours, and it is the only sentence
 * on screen that reads like a log line. Anything unrecognised gets a generic
 * message rather than passing the raw text through, because an auth error we
 * have not thought about is exactly the kind that mentions internals.
 */
function signUpMessage(error: { code?: string; message: string }): string {
  if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
    return "There is already an account with that email. Try signing in instead.";
  }
  if (error.code === "weak_password") {
    return "Choose a longer password — at least 8 characters.";
  }
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "Too many attempts just now. Wait a minute and try again.";
  }
  return "Could not create that account. Check the details and try again.";
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
    return { error: signUpMessage(error), notice: null };
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
