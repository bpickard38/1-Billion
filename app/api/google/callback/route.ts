import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const fail = (reason: string) => {
    const url = new URL("/more", request.url);
    url.searchParams.set("google_error", reason);
    const response = NextResponse.redirect(url);
    response.cookies.delete("google_oauth_state");
    return response;
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("google_oauth_state")?.value;

  // Basic CSRF guard: a forged callback hit without the state cookie this
  // session's own /connect call set can't attach tokens to this account.
  if (!code || !state || !savedState || state !== savedState) {
    return fail("Google sign-in didn't complete. Try connecting again.");
  }

  const redirectUri = new URL("/api/google/callback", request.url).toString();
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  let refreshToken: string | null | undefined;
  let accessToken: string | null | undefined;
  let expiryDate: number | null | undefined;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    refreshToken = tokens.refresh_token;
    accessToken = tokens.access_token;
    expiryDate = tokens.expiry_date;
    oauth2Client.setCredentials(tokens);
  } catch {
    return fail("Google didn't confirm the connection. Try again.");
  }

  if (!refreshToken) {
    return fail("Google didn't return a long-lived token — try disconnecting Google's access for this app at myaccount.google.com and reconnecting.");
  }

  const { data: existing } = await supabase.from("google_tokens").select("calendar_id").maybeSingle();

  let calendarId = existing?.calendar_id ?? null;
  if (!calendarId) {
    try {
      const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });
      const { data: created } = await calendarApi.calendars.insert({ requestBody: { summary: "1B" } });
      calendarId = created.id ?? null;
    } catch {
      return fail("Connected, but couldn't create the \"1B\" calendar. Try again.");
    }
  }

  const { error } = await supabase.from("google_tokens").upsert(
    {
      refresh_token: refreshToken,
      access_token: accessToken,
      expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
      calendar_id: calendarId,
    },
    { onConflict: "user_id" }
  );
  if (error) return fail(error.message);

  const response = NextResponse.redirect(new URL("/more?google=connected", request.url));
  response.cookies.delete("google_oauth_state");
  return response;
}
