import { z } from "zod";

/**
 * Validation for the two auth forms, and the FormData reading in front of it.
 *
 * This lives outside `app/(auth)/actions.ts` for the same reason `AuthState`
 * does: a `"use server"` module may only export async functions, because every
 * export in one becomes a callable server endpoint. Keeping the schemas here
 * also means they can be tested directly, which matters — see `field` below.
 */

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  full_name: z.string().trim().min(1, "Tell us your name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  school: z.string().trim().optional(),
  organizer_code: z.string().trim().optional(),
});

/**
 * Reads one field, treating a field that was never rendered as absent.
 *
 * `FormData.get()` returns `null` for a name that is not in the submitted
 * form, and Zod's `.optional()` accepts `undefined` but not `null`. The two
 * disagree, and the gap is not hypothetical: the organizer code input only
 * exists after somebody clicks "I have an organizer code", so for every
 * ordinary applicant that field was `null` and sign-up failed on
 * "Invalid input: expected string, received null".
 *
 * It only ever surfaced on the common path, because opening the disclosure to
 * try an organizer code made the input exist and submit an empty string,
 * which parsed fine. That is why it survived being clicked through.
 */
function field(data: FormData, name: string): string | undefined {
  const value = data.get(name);
  return typeof value === "string" ? value : undefined;
}

export function readSignIn(data: FormData) {
  return signInSchema.safeParse({
    email: field(data, "email"),
    password: field(data, "password"),
  });
}

export function readSignUp(data: FormData) {
  return signUpSchema.safeParse({
    full_name: field(data, "full_name"),
    email: field(data, "email"),
    password: field(data, "password"),
    school: field(data, "school"),
    organizer_code: field(data, "organizer_code"),
  });
}
