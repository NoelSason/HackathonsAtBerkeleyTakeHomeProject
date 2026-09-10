"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Refreshes the page when this applicant's own rows change.
 *
 * A decision can land while the tab is sitting open, and telling someone to
 * reload to find out whether they got in is a poor way to deliver that news.
 * Rather than push the row into React state, this asks Next to re-render the
 * server component, so there is still exactly one place the page is built
 * and no client-side copy of the data to keep in step.
 *
 * The filter is a courtesy, not a control: row-level security means the
 * subscription would only ever receive this user's rows anyway.
 */
export function LiveRefresh({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("my-applications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications", filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
