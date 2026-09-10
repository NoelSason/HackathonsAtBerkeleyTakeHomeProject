"use client";

import { useState } from "react";
import { startApplication } from "@/app/(portal)/apply/actions";
import { APPLICATION_ROLES, ROLE_COPY, type ApplicationRole } from "@/lib/applications/roles";
import { APPLICATION_FORMS } from "@/lib/applications/forms";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["application_status"];

export function RolePicker({ existing }: { existing: Partial<Record<ApplicationRole, Status>> }) {
  // Default to the first role they have not started, so the common case is
  // one click rather than a choice they have already made.
  const firstAvailable = APPLICATION_ROLES.find((role) => !existing[role]) ?? "hacker";
  const [selected, setSelected] = useState<ApplicationRole>(firstAvailable);

  return (
    <form action={startApplication}>
      <input type="hidden" name="role" value={selected} />

      <ul className="mt-11 space-y-3">
        {APPLICATION_ROLES.map((role) => {
          const status = existing[role];
          const active = selected === role;

          return (
            <li key={role}>
              <label
                className={cn(
                  "relative flex cursor-pointer items-center gap-5 rounded-control border bg-surface px-6 py-5 transition-colors",
                  active ? "border-[1.5px] border-berkeley" : "border-line hover:border-line-strong",
                )}
              >
                {/* The gold spine only appears on the selected row. It is the
                    one place gold carries state rather than decoration. */}
                {active && <span aria-hidden className="absolute inset-y-0 -left-px w-[3px] bg-gold" />}

                <input
                  type="radio"
                  name="role_choice"
                  value={role}
                  checked={active}
                  onChange={() => setSelected(role)}
                  className="sr-only"
                />

                <span
                  aria-hidden
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 rounded-full bg-surface",
                    active ? "border-[5px] border-berkeley" : "border-[1.5px] border-line-strong",
                  )}
                />

                <span className="flex-1">
                  <span className="flex items-center gap-3">
                    <span className="text-[17px] font-bold">{ROLE_COPY[role].label}</span>
                    {status && <StatusBadge status={status} />}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{ROLE_COPY[role].blurb}</span>
                </span>

                <span className="shrink-0 font-mono text-[12px] text-muted">
                  ~{APPLICATION_FORMS[role].estimatedMinutes} min
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-9 flex justify-end">
        <Button type="submit" className="h-11 px-9">
          {existing[selected] ? "Open" : "Start"} {ROLE_COPY[selected].label.toLowerCase()} application
        </Button>
      </div>
    </form>
  );
}
