import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16 renamed the `middleware` file convention to `proxy`. Same runtime,
// same signature; `middleware.ts` still works but logs a deprecation warning.
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets. Running on image and font requests would
  // add a token refresh round trip to each one for no benefit.
  matcher: [
    "/((?!_next/static|_next/image|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
