import webpush from "web-push";
import { addDays, format, parseISO } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getLocalWeekday,
  getLocalHour,
  getLocalDateString,
  getWeekStartDateString,
  DEFAULT_TIMEZONE,
} from "@/lib/dates";
import { kindsScheduledAtHour, notificationContent, isNotificationEnabled } from "@/lib/notifications";
import { computeWeekScore, type DayTodoStat } from "@/lib/score";
import { syncGoogleCalendarForUser } from "@/lib/google";
import type { Database, Json } from "@/lib/supabase/types";
import type { AppDatabase } from "@/lib/app-database";
import type { SupabaseClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

type Admin = SupabaseClient<Database>;

async function sendToUser(admin: Admin, userId: string, payload: string) {
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }
}

type QueueItem = { refId: string; content: { title: string; body: string; url: string } };

// Which condition (per §3.9) gates each notification kind, evaluated fresh
// every hour rather than stored — same "derived, not stored" shape as
// goal progress and the week score.
async function itemsForKind(
  admin: Admin,
  userId: string,
  kind: Parameters<typeof notificationContent>[0],
  todayStr: string
): Promise<QueueItem[]> {
  switch (kind) {
    case "plan_day": {
      const { count } = await (admin as unknown as SupabaseClient<AppDatabase>)
        .from("todos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("date", todayStr);
      if (count) return [];
      return [{ refId: "", content: notificationContent("plan_day") }];
    }
    case "daily_review": {
      const { data } = await admin
        .from("daily_entries")
        .select("submitted_at")
        .eq("user_id", userId)
        .eq("date", todayStr)
        .maybeSingle();
      if (data?.submitted_at) return [];
      return [{ refId: "", content: notificationContent("daily_review") }];
    }
    case "weekly_review":
      return [{ refId: "", content: notificationContent("weekly_review") }];
  }
}

async function computeUserWeekScore(admin: Admin, userId: string, weekStart: string, weekEnd: string) {
  const { data: todos } = await (admin as unknown as SupabaseClient<AppDatabase>)
    .from("todos")
    .select("date, done")
    .eq("user_id", userId)
    .gte("date", weekStart)
    .lte("date", weekEnd);

  const byDate = new Map<string, DayTodoStat>();
  for (const todo of todos ?? []) {
    const stat = byDate.get(todo.date) ?? { date: todo.date, total: 0, done: 0 };
    stat.total++;
    if (todo.done) stat.done++;
    byDate.set(todo.date, stat);
  }

  return computeWeekScore([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
}

// Same auto-close semantics as the manual "Close unreviewed weeks" button
// (app/(app)/week/actions.ts#closeUnreviewedWeeks), but admin-scoped across
// every user and gated to Monday 00:00 local per §3.5's [DECIDE] resolution
// — running it every hour would just be redundant, since it's idempotent.
async function autoCloseStaleWeeks(admin: Admin, userId: string, timeZone: string) {
  const currentWeekStart = getWeekStartDateString(new Date(), timeZone);

  const { data: reviewedWeeks } = await admin
    .from("weekly_reviews")
    .select("week_start")
    .eq("user_id", userId)
    .not("closed_at", "is", null);
  const reviewedSet = new Set((reviewedWeeks ?? []).map((w) => w.week_start));

  const LOOKBACK_WEEKS = 52;
  let cursor = currentWeekStart;

  for (let i = 0; i < LOOKBACK_WEEKS; i++) {
    cursor = format(addDays(parseISO(cursor), -7), "yyyy-MM-dd");
    if (reviewedSet.has(cursor)) continue;

    const weekEnd = format(addDays(parseISO(cursor), 6), "yyyy-MM-dd");
    const { score, breakdown, biggestIssue } = await computeUserWeekScore(admin, userId, cursor, weekEnd);

    await admin.from("weekly_reviews").upsert(
      {
        user_id: userId,
        week_start: cursor,
        score,
        breakdown: breakdown as unknown as Json,
        biggest_issue: biggestIssue,
        closed_at: new Date().toISOString(),
        auto_closed: true,
      },
      { onConflict: "user_id,week_start" }
    );
  }
}

// Hourly tick (see supabase/migrations/0006_cron_schedule.sql — Vercel Hobby
// caps cron at once/day, so a Supabase pg_cron job POSTs here every hour
// instead). Sends whichever notifications are due this local hour for each
// user, deduped via notification_log, and auto-closes stale weeks at
// Monday 00:00 local.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const demoAccountsDeleted = await deleteExpiredDemoAccounts(admin, now);

  const { data: profiles } = await admin.from("profiles").select("id, timezone, notification_prefs");

  let notificationsSent = 0;
  let weeksClosed = 0;

  for (const profile of profiles ?? []) {
    const timeZone = profile.timezone ?? DEFAULT_TIMEZONE;
    const weekday = getLocalWeekday(now, timeZone);
    const hour = getLocalHour(now, timeZone);
    const todayStr = getLocalDateString(now, timeZone);
    const prefs = (profile.notification_prefs as Record<string, boolean> | null) ?? {};

    for (const kind of kindsScheduledAtHour(weekday, hour)) {
      if (!isNotificationEnabled(prefs, kind)) continue;

      const items = await itemsForKind(admin, profile.id, kind, todayStr);
      for (const item of items) {
        // Claim before sending: a retry or overlapping run hits the same
        // unique(user_id, kind, sent_for, ref_id) row and backs off.
        const { error: claimError } = await admin
          .from("notification_log")
          .insert({ user_id: profile.id, kind, sent_for: todayStr, ref_id: item.refId });
        if (claimError) continue; // already claimed (or a real error) — skip either way

        await sendToUser(admin, profile.id, JSON.stringify(item.content));
        notificationsSent++;
      }
    }

    if (weekday === 1 && hour === 0) {
      await autoCloseStaleWeeks(admin, profile.id, timeZone);
      weeksClosed++;
    }

    // Pull direction (Phase 10), same cadence as the Schedule tab's
    // on-load sync — this is what keeps the day view current when the app
    // isn't open to trigger a sync itself.
    const { data: tokenRow } = await admin
      .from("google_tokens")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (tokenRow) {
      await syncGoogleCalendarForUser(admin, profile.id, tokenRow, timeZone);
    }
  }

  return Response.json({ notificationsSent, usersWithAutoCloseChecked: weeksClosed, demoAccountsDeleted });
}

// "Try the demo" accounts are anonymous users; drop them after 24h. Their
// rows in every public table go with them (user_id ... on delete cascade).
async function deleteExpiredDemoAccounts(admin: Admin, now: Date) {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  let deleted = 0;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const user of data.users) {
      if (user.is_anonymous && Date.parse(user.created_at) < cutoff) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
        if (!deleteError) deleted++;
      }
    }
    if (data.users.length < 1000) break;
  }
  return deleted;
}
