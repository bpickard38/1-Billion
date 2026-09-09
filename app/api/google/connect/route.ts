import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

// The two-way sync in §3.3/§6 Phase 10 only ever touches the "1B" calendar
// it creates itself, plus reading the primary calendar for display.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const redirectUri = new URL("/api/google/callback", request.url).toString();
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  // access_type: offline is what gets a refresh_token back at all; prompt:
  // consent forces Google to reissue one even on a reconnect (Google only
  // hands out a refresh_token on a user's *first* consent otherwise).
  const state = crypto.randomUUID();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google",
  });
  return response;
}
