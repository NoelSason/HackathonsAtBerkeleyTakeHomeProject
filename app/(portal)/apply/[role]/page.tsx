import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { isApplicationRole, ROLE_COPY } from "@/lib/applications/roles";
import { APPLICATION_FORMS } from "@/lib/applications/forms";
import { ApplicationForm } from "@/components/applications/application-form";
import { StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import type { FieldValue } from "@/components/applications/field-control";
import { daysUntilDeadline } from "@/lib/event";

export const metadata: Metadata = { title: "Application" };

export default async function ApplyRolePage({ params }: PageProps<"/apply/[role]">) {
  const { role } = await params;
  if (!isApplicationRole(role)) notFound();

  const profile = await requireProfile();
  const supabase = await createClient();

  // The landing page links straight here, so this is a legitimate first
  // touch and the draft may not exist yet. `ignoreDuplicates` against the
  // (user_id, role) unique constraint makes arriving twice harmless.
  await supabase
    .from("applications")
    .upsert({ user_id: profile.id, role, status: "draft" }, { onConflict: "user_id,role", ignoreDuplicates: true });

  const { data: application } = await supabase
    .from("applications")
    .select("id, status, responses, display_id")
    .eq("role", role)
    .single();

  if (!application) notFound();

  // Editing stops at submission. The row could not be updated anyway — the
  // update policy only matches drafts — so this avoids showing a form whose
  // save would silently do nothing.
  if (application.status !== "draft") {
    return <SubmittedView role={role} application={application} />;
  }

  const responses = (application.responses ?? {}) as Record<string, FieldValue>;

  return (
    <ApplicationForm
      applicationId={application.id}
      role={role}
      initialResponses={responses}
      daysLeft={daysUntilDeadline()}
    />
  );
}

function SubmittedView({
  role,
  application,
}: {
  role: keyof typeof ROLE_COPY;
  application: { status: Parameters<typeof StatusBadge>[0]["status"]; responses: unknown; display_id: number };
}) {
  const sections = APPLICATION_FORMS[role].sections;
  const responses = (application.responses ?? {}) as Record<string, FieldValue>;

  return (
    <div className="mx-auto max-w-190 px-6 py-14">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {ROLE_COPY[role].label} application
        </h1>
        <span className="font-mono text-[12px] text-faint">APP-{application.display_id}</span>
        <StatusBadge status={application.status} />
      </div>

      <p className="mt-2 text-muted">
        This is what the review committee sees. It can no longer be edited.
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.id}>
            <h2 className="border-b border-line pb-2 font-mono text-[11px] tracking-[0.08em] text-faint uppercase">
              {section.title}
            </h2>
            <dl className="mt-3 space-y-3">
              {section.fields.map((field) => {
                const value = responses[field.id];
                const display = Array.isArray(value) ? value.join(", ") : (value ?? "");
                return (
                  <div key={field.id} className="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
                    <dt className="text-[13px] text-muted">{field.label}</dt>
                    <dd className={display ? "text-sm" : "text-sm text-faint"}>
                      {display || "Not answered"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-7">
        <Link href="/dashboard" className={buttonStyles("secondary", "md")}>
          Back to my applications
        </Link>
      </div>
    </div>
  );
}
