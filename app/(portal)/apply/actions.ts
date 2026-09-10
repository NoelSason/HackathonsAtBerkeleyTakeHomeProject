"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isApplicationRole, type ApplicationRole } from "@/lib/applications/roles";
import { draftSchema, fieldsFor, submitSchema } from "@/lib/applications/forms";

export type SaveState = { savedAt: string | null; error: string | null };
export type SubmitState = { error: string | null; fieldErrors: Record<string, string> };

/**
 * Opens the application for a role, creating the draft on first visit.
 *
 * `upsert` with the (user_id, role) unique constraint as the conflict target
 * makes this safe to call twice. Someone double-clicking "Start application",
 * or opening it in two tabs, gets the same row rather than a duplicate-key
 * error or a second application.
 */
export async function startApplication(formData: FormData) {
  const profile = await requireProfile();
  const role = formData.get("role");

  if (typeof role !== "string" || !isApplicationRole(role)) {
    throw new Error("Unknown application role");
  }

  const supabase = await createClient();
  await supabase
    .from("applications")
    .upsert({ user_id: profile.id, role, status: "draft" }, { onConflict: "user_id,role", ignoreDuplicates: true });

  redirect(`/apply/${role}`);
}

/** "github.com/x" is what people type; store something a browser can open. */
function normaliseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Answers are only ever a string or a list of strings, and both are valid
 * JSON. Naming that shape lets the normalised object be written to Postgres
 * directly, so nothing has to be cast back out of Zod's untyped output.
 */
type ResponseMap = Record<string, string | string[]>;

function readResponses(role: ApplicationRole, raw: unknown): ResponseMap {
  const source = (raw ?? {}) as Record<string, unknown>;
  const cleaned: ResponseMap = {};

  for (const field of fieldsFor(role)) {
    const value = source[field.id];
    if (value === undefined) continue;

    if (field.type === "multi_select") {
      cleaned[field.id] = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    } else if (field.type === "url" && typeof value === "string") {
      cleaned[field.id] = normaliseUrl(value);
    } else {
      cleaned[field.id] = typeof value === "string" ? value : "";
    }
  }

  return cleaned;
}

/**
 * Autosave. Called on a debounce while the applicant is still typing.
 *
 * Row-level security is what stops this writing to someone else's
 * application: the update policy only matches rows the caller owns that are
 * still drafts, so a forged id updates nothing rather than failing loudly.
 */
export async function saveDraft(applicationId: string, role: ApplicationRole, responses: unknown): Promise<SaveState> {
  await requireProfile();

  // Zod is used to validate, not to transform. The value written is the
  // normalised object built above, which is already correctly typed, so the
  // write needs no cast back out of Zod's unknown-valued output.
  const cleaned = readResponses(role, responses);
  if (!draftSchema(role).safeParse(cleaned).success) {
    return { savedAt: null, error: "Some answers could not be saved." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ responses: cleaned })
    .eq("id", applicationId)
    .eq("status", "draft");

  if (error) return { savedAt: null, error: "Could not reach the server." };

  return { savedAt: new Date().toISOString(), error: null };
}

/** Final validation, then the one status change an applicant is allowed. */
export async function submitApplication(
  applicationId: string,
  role: ApplicationRole,
  responses: unknown,
): Promise<SubmitState> {
  await requireProfile();

  const cleaned = readResponses(role, responses);
  const parsed = submitSchema(role).safeParse(cleaned);

  if (!parsed.success) {
    // Surfaced per field so the form can jump to the section that is short an
    // answer, rather than showing one message at the bottom.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Some answers still need attention.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({
      responses: cleaned,
      status: "submitted",
      // The submitted_at_matches_status constraint rejects the row without
      // this, which is the database refusing to hold an inconsistent record
      // rather than trusting this function to remember.
      submitted_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "draft");

  if (error) {
    return { error: "Could not submit. Try again in a moment.", fieldErrors: {} };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?submitted=1");
}

/** Drafts can be thrown away. Submitted applications cannot, by policy. */
export async function deleteDraft(formData: FormData) {
  await requireProfile();
  const applicationId = formData.get("application_id");
  if (typeof applicationId !== "string") return;

  const supabase = await createClient();
  await supabase.from("applications").delete().eq("id", applicationId).eq("status", "draft");

  revalidatePath("/dashboard");
}
