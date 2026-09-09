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
import { computeWeekScore } from "@/lib/score";
import type { Database, Json } from "@/lib/supabase/types";
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
// habit streaks, goal progress, and the week score.
async function itemsForKind(
  admin: Admin,
  userId: string,
  kind: Parameters<typeof notificationContent>[0],
  todayStr: string
): Promise<QueueItem[]> {
  switch (kind) {
    case "today_priority": {
      const { data } = await admin
        .from("daily_entries")
        .select("priority_text")
        .eq("user_id", userId)
        .eq("date", todayStr)
        .maybeSingle();
      if (data?.priority_text) return [];
      return [{ refId: "", content: notificationContent("today_priority") }];
    }
    case "uncomfortable_rep": {
      const { data: habit } = await admin
        .from("habits")
        .select("id")
        .eq("user_id", userId)
        .eq("name", "Uncomfortable rep")
        .maybeSingle();
      if (!habit) return [];
      const { data: log } = await admin
        .from("habit_logs")
        .select("done")
        .eq("habit_id", habit.id)
        .eq("date", todayStr)
        .maybeSingle();
      if (log?.done) return [];
      return [{ refId: "", content: notificationContent("uncomfortable_rep") }];
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
    case "followup_reminder": {
      const { data: contacts } = await admin
        .from("contacts")
        .select("id, name")
        .eq("user_id", userId)
        .eq("follow_up_on", todayStr);
      return (contacts ?? []).map((c) => ({
        refId: c.id,
        content: notificationContent("followup_reminder", { contactName: c.name }),
      }));
    }
  }
}

async function computeUserWeekScore(admin: Admin, userId: string, weekStart: string, weekEnd: string) {
  const [{ data: habits }, { data: logs }] = await Promise.all([
    admin.from("habits").select("id, name, days_of_week").eq("user_id", userId).eq("active", true),
    admin
      .from("habit_logs")
      .select("habit_id, date")
      .eq("user_id", userId)
      .eq("done", true)
      .gte("date", weekStart)
      .lte("date", weekEnd),
  ]);

  const doneByHabit = new Map<string, number>();
  for (const log of logs ?? []) {
    doneByHabit.set(log.habit_id, (doneByHabit.get(log.habit_id) ?? 0) + 1);
  }

  const habitStats = (habits ?? []).map((h) => ({
    habitId: h.id,
    name: h.name,
    scheduledDays: h.days_of_week.length,
    doneDays: doneByHabit.get(h.id) ?? 0,
  }));

  return computeWeekScore(habitStats);
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
  }

  return Response.json({ notificationsSent, usersWithAutoCloseChecked: weeksClosed });
}
