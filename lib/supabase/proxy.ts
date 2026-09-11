import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { homeFor } from "@/lib/landing";
import type { Database } from "@/lib/database.types";

/** Routes a signed-out visitor is allowed to reach. */
const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"];

/** Once signed in, these two make no sense any more. */
const AUTH_PATHS = ["/sign-in", "/sign-up"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/");
}

/**
 * Refreshes the session on every request and turns signed-out visitors away
 * from the private half of the portal.
 *
 * Supabase access tokens are short-lived. Without something running ahead of
 * the page, a token would expire mid-visit and a Server Component would
 * render as signed out even though the refresh token is still good. Server
 * Components also cannot write cookies, so this is the one place a rotated
 * token can actually be persisted.
 *
 * This only checks whether somebody is signed in. Whether they are a reviewer
 * or a director needs a database read, which belongs in the organizer layout
 * rather than in front of every asset request.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Written twice on purpose. The first pass updates the request so
        // anything downstream in this same pass sees the new token; the
        // second puts it on the response so the browser keeps it.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates the token against Supabase. getSession() would just
  // decode the cookie, which the browser could have edited, so it must not be
  // what an access decision is based on.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    // Remember where they were headed so the redirect after sign-in lands
    // somewhere useful instead of dumping everyone on the dashboard.
    signIn.searchParams.set("next", pathname);
    return NextResponse.redirect(signIn);
  }

  if (user && AUTH_PATHS.includes(pathname)) {
    // Send them wherever they actually work. The extra read only happens when
    // somebody already signed in navigates back to the sign-in page, which is
    // rare enough not to be worth caching, and landing a director on an empty
    // applicant dashboard is worse than one query.
    const { data: profile } = await supabase
      .from("profiles")
      .select("staff_role")
      .eq("id", user.id)
      .single();

    const home = request.nextUrl.clone();
    home.pathname = homeFor(profile?.staff_role ?? null);
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}
