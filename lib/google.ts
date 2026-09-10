import { google, type calendar_v3 } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLocalDateString, localTimeToInstant, DEFAULT_TIMEZONE } from "@/lib/dates";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { Database, Tables } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;
type GoogleTokenRow = Tables<"google_tokens">;

// How far ahead (and behind, from local midnight today) the *first* pull
// looks before it has a syncToken to work incrementally from. Once a
// syncToken exists, Google keeps returning changes regardless of this
// window — it only bounds the initial/resync fetch.
const SYNC_WINDOW_DAYS = 30;

function isValidCategory(value: string | null | undefined): value is Category {
  return !!value && (CATEGORIES as readonly string[]).includes(value);
}

// Builds an authenticated Calendar client from stored tokens, refreshing the
// access token up front if it's expired. Returns whatever new access
// token/expiry resulted, so the caller can persist it — googleapis refreshes
// in memory only, it never writes back to our database itself.
async function withGoogleCalendar<T>(
  tokenRow: Pick<GoogleTokenRow, "refresh_token" | "access_token" | "expires_at">,
  fn: (calendarApi: calendar_v3.Calendar) => Promise<T>
): Promise<{
  result: T;
  refreshedTokens: { access_token: string | null; expires_at: string | null } | null;
}> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: tokenRow.refresh_token,
    access_token: tokenRow.access_token ?? undefined,
    expiry_date: tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : undefined,
  });

  const beforeToken = oauth2Client.credentials.access_token;
  await oauth2Client.getAccessToken(); // no-op if the cached token isn't expired yet
  const after = oauth2Client.credentials;
  const refreshedTokens =
    after.access_token !== beforeToken
      ? {
          access_token: after.access_token ?? null,
          expires_at: after.expiry_date ? new Date(after.expiry_date).toISOString() : null,
        }
      : null;

  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });
  const result = await fn(calendarApi);
  return { result, refreshedTokens };
}

function eventBody(block: {
  title: string;
  start_at: string;
  end_at: string;
  category: string;
}): calendar_v3.Schema$Event {
  return {
    summary: block.title,
    start: { dateTime: block.start_at },
    end: { dateTime: block.end_at },
    extendedProperties: { private: { app_category: block.category } },
  };
}

async function pushBlockUpsert(
  calendarApi: calendar_v3.Calendar,
  calendarId: string,
  block: { title: string; start_at: string; end_at: string; category: string; google_event_id: string | null }
): Promise<{ eventId: string; etag: string | null }> {
  const requestBody = eventBody(block);
  if (block.google_event_id) {
    const { data } = await calendarApi.events.update({
      calendarId,
      eventId: block.google_event_id,
      requestBody,
    });
    return { eventId: data.id!, etag: data.etag ?? null };
  }
  const { data } = await calendarApi.events.insert({ calendarId, requestBody });
  return { eventId: data.id!, etag: data.etag ?? null };
}

async function pushBlockDelete(
  calendarApi: calendar_v3.Calendar,
  calendarId: string,
  googleEventId: string
): Promise<void> {
  try {
    await calendarApi.events.delete({ calendarId, eventId: googleEventId });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 404 && code !== 410) throw err; // already gone on Google's side — fine
  }
}

// Push direction (app -> Google "1B" calendar): called from today/actions.ts
// on create/update of a schedule_block, best-effort — a network hiccup here
// shouldn't block a local schedule edit, so errors are caught and logged.
export async function syncBlockToGoogle(
  supabase: Client,
  block: {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    category: string;
    google_event_id: string | null;
  }
): Promise<void> {
  const { data: tokenRow } = await supabase.from("google_tokens").select("*").maybeSingle();
  if (!tokenRow?.calendar_id) return;

  try {
    const { result, refreshedTokens } = await withGoogleCalendar(tokenRow, (calendarApi) =>
      pushBlockUpsert(calendarApi, tokenRow.calendar_id!, block)
    );
    await supabase
      .from("schedule_blocks")
      .update({ google_event_id: result.eventId, google_etag: result.etag })
      .eq("id", block.id);
    if (refreshedTokens) {
      await supabase.from("google_tokens").update(refreshedTokens).eq("id", tokenRow.id);
    }
  } catch (err) {
    console.error("Google push failed for block", block.id, err);
  }
}

// Push direction, delete: called from today/actions.ts on delete of a
// schedule_block that had a google_event_id.
export async function deleteBlockFromGoogle(supabase: Client, googleEventId: string | null): Promise<void> {
  if (!googleEventId) return;
  const { data: tokenRow } = await supabase.from("google_tokens").select("*").maybeSingle();
  if (!tokenRow?.calendar_id) return;

  try {
    const { refreshedTokens } = await withGoogleCalendar(tokenRow, (calendarApi) =>
      pushBlockDelete(calendarApi, tokenRow.calendar_id!, googleEventId)
    );
    if (refreshedTokens) {
      await supabase.from("google_tokens").update(refreshedTokens).eq("id", tokenRow.id);
    }
  } catch (err) {
    console.error("Google delete failed for event", googleEventId, err);
  }
}

function syncWindowStart(timeZone: string): string {
  return localTimeToInstant(getLocalDateString(new Date(), timeZone), "00:00", timeZone).toISOString();
}

function syncWindowEnd(timeZone: string): string {
  const future = new Date(Date.now() + SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return localTimeToInstant(getLocalDateString(future, timeZone), "23:59:59", timeZone).toISOString();
}

// Fetches every changed event since `syncToken` (or, with none yet, every
// event in a bounded window). A 410 means the token expired on Google's
// side — retried once from scratch, since that's Google's documented
// recovery path for an invalid/expired syncToken.
async function listChanges(
  calendarApi: calendar_v3.Calendar,
  calendarId: string,
  syncToken: string | null,
  timeZone: string
): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken: string | null }> {
  let token = syncToken;
  let attemptedFullResync = false;
  let events: calendar_v3.Schema$Event[] = [];
  let nextSyncToken: string | null = null;
  let pageToken: string | undefined;

  for (;;) {
    try {
      const { data } = await calendarApi.events.list({
        calendarId,
        singleEvents: true,
        showDeleted: true,
        maxResults: 250,
        pageToken,
        ...(token
          ? { syncToken: token }
          : { timeMin: syncWindowStart(timeZone), timeMax: syncWindowEnd(timeZone) }),
      });
      events.push(...(data.items ?? []));
      if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
      pageToken = data.nextPageToken ?? undefined;
      if (!pageToken) return { events, nextSyncToken };
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 410 && token && !attemptedFullResync) {
        attemptedFullResync = true;
        token = null;
        pageToken = undefined;
        events = [];
        nextSyncToken = null;
        continue;
      }
      throw err;
    }
  }
}

async function syncPrimaryCalendar(
  supabase: Client,
  userId: string,
  calendarApi: calendar_v3.Calendar,
  syncToken: string | null,
  timeZone: string
): Promise<string | null> {
  const { events, nextSyncToken } = await listChanges(calendarApi, "primary", syncToken, timeZone);

  for (const event of events) {
    if (!event.id) continue;

    if (event.status === "cancelled") {
      await supabase.from("schedule_blocks").delete().eq("user_id", userId).eq("google_event_id", event.id);
      continue;
    }

    const startIso = event.start?.dateTime;
    const endIso = event.end?.dateTime;
    if (!startIso || !endIso) continue; // all-day events are out of scope for the hourly day view

    await supabase.from("schedule_blocks").upsert(
      {
        user_id: userId,
        date: getLocalDateString(new Date(startIso), timeZone),
        start_at: startIso,
        end_at: endIso,
        title: event.summary || "(untitled)",
        category: "Google",
        source: "google_primary",
        done: false,
        google_event_id: event.id,
        google_etag: event.etag ?? null,
      },
      { onConflict: "user_id,google_event_id" }
    );
  }

  return nextSyncToken ?? syncToken;
}

async function syncOneBillionCalendar(
  supabase: Client,
  userId: string,
  calendarApi: calendar_v3.Calendar,
  calendarId: string,
  syncToken: string | null,
  timeZone: string
): Promise<string | null> {
  const { events, nextSyncToken } = await listChanges(calendarApi, calendarId, syncToken, timeZone);

  for (const event of events) {
    if (!event.id) continue;

    if (event.status === "cancelled") {
      await supabase.from("schedule_blocks").delete().eq("user_id", userId).eq("google_event_id", event.id);
      continue;
    }

    const startIso = event.start?.dateTime;
    const endIso = event.end?.dateTime;
    if (!startIso || !endIso) continue;

    const { data: existing } = await supabase
      .from("schedule_blocks")
      .select("id, updated_at, category")
      .eq("user_id", userId)
      .eq("google_event_id", event.id)
      .maybeSingle();

    const appCategory = event.extendedProperties?.private?.app_category;
    const category = isValidCategory(appCategory) ? appCategory : (existing?.category ?? "Google");
    const date = getLocalDateString(new Date(startIso), timeZone);

    if (existing) {
      // Conflict rule (PLAN.md §6 Phase 10 step 6): last-modified wins by
      // `updated` timestamp, logged, no merge UI. If the local edit is
      // newer, skip applying Google's stale version — the next local edit's
      // push overwrites Google with the current version anyway.
      const remoteUpdated = event.updated ? new Date(event.updated).getTime() : 0;
      const localUpdated = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      if (remoteUpdated <= localUpdated) {
        console.log(`Google sync conflict on block ${existing.id}: local edit is newer, keeping local version`);
        continue;
      }
      await supabase
        .from("schedule_blocks")
        .update({
          date,
          start_at: startIso,
          end_at: endIso,
          title: event.summary || "(untitled)",
          category,
        })
        .eq("id", existing.id);
    } else {
      // Created directly on the "1B" calendar in Google, not by the app.
      await supabase.from("schedule_blocks").insert({
        user_id: userId,
        date,
        start_at: startIso,
        end_at: endIso,
        title: event.summary || "(untitled)",
        category,
        source: "google",
        done: false,
        google_event_id: event.id,
        google_etag: event.etag ?? null,
      });
    }
  }

  return nextSyncToken ?? syncToken;
}

// Pull direction, both calendars: called on Schedule tab load and from the
// hourly cron tick for every connected user. Always writes last_synced_at /
// last_sync_error so the Settings "Sync now" button has something to show,
// win or lose.
export async function syncGoogleCalendarForUser(
  supabase: Client,
  userId: string,
  tokenRow: GoogleTokenRow,
  timeZone: string = DEFAULT_TIMEZONE
): Promise<void> {
  let primarySyncToken = tokenRow.primary_sync_token;
  let onebillionSyncToken = tokenRow.onebillion_sync_token;
  let error: string | null = null;
  let refreshedTokens: { access_token: string | null; expires_at: string | null } | null = null;

  try {
    const { refreshedTokens: rt } = await withGoogleCalendar(tokenRow, async (calendarApi) => {
      primarySyncToken = await syncPrimaryCalendar(supabase, userId, calendarApi, primarySyncToken, timeZone);
      if (tokenRow.calendar_id) {
        onebillionSyncToken = await syncOneBillionCalendar(
          supabase,
          userId,
          calendarApi,
          tokenRow.calendar_id,
          onebillionSyncToken,
          timeZone
        );
      }
    });
    refreshedTokens = rt;
  } catch (err) {
    error = err instanceof Error ? err.message : "Sync failed";
    console.error("Google sync failed for user", userId, err);
  }

  await supabase
    .from("google_tokens")
    .update({
      ...(refreshedTokens ?? {}),
      primary_sync_token: primarySyncToken,
      onebillion_sync_token: onebillionSyncToken,
      last_synced_at: new Date().toISOString(),
      last_sync_error: error,
    })
    .eq("user_id", userId);
}
