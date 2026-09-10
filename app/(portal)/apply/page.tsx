import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { RolePicker } from "@/components/applications/role-picker";
import type { ApplicationRole } from "@/lib/applications/roles";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Apply" };

type Status = Database["public"]["Enums"]["application_status"];

export default async function ApplyPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Scoped to this person explicitly.
  //
  // It is tempting to leave this off, because the select policy on
  // applications already stops an applicant reading anybody else's row. But
  // policies OR together, and there are two: "applicants read their own" and
  // "organizers read every application". An organizer matches the second, so
  // an unfiltered query here does not mean "mine" for them, it means "all
  // sixty-one" — and this is a page titled My applications.
  //
  // Row-level security decides what a query is allowed to return. It is not
  // a substitute for saying what the query is actually asking for.
  const { data } = await supabase
    .from("applications")
    .select("role, status")
    .eq("user_id", profile.id);

  const existing: Partial<Record<ApplicationRole, Status>> = {};
  for (const row of data ?? []) {
    existing[row.role] = row.status;
  }

  return (
    <div className="mx-auto max-w-190 px-6 py-16 sm:py-22">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-[34px]">
        How do you want to participate?
      </h1>
      <p className="mt-2.5 text-muted">
        You can apply for more than one role. Each role has its own application.
      </p>

      <RolePicker existing={existing} />
    </div>
  );
}
