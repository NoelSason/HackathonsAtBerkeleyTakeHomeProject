import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { RolePicker } from "@/components/applications/role-picker";
import type { ApplicationRole } from "@/lib/applications/roles";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Apply" };

type Status = Database["public"]["Enums"]["application_status"];

export default async function ApplyPage() {
  await requireProfile();
  const supabase = await createClient();

  // No user_id filter needed. The select policy already restricts this to the
  // caller's own rows, and adding one here would imply the query is what
  // provides the isolation.
  const { data } = await supabase.from("applications").select("role, status");

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
