import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on every route except static assets and PWA files, which have no
  // session and must never be redirected to /login.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
