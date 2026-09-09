import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on every route except static assets, PWA files, API routes, and the
  // Google Search Console verification file (google-site-verification, for
  // Phase 10's OAuth publishing) — none of those have a session, and must
  // never get redirected to /login instead of serving their real content.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|api/|google0ff153ac73911233\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
