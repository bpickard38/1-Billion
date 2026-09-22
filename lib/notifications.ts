// Which push notifications exist, when the hourly cron should consider
// sending each one, and what they say. Pure/unit-tested — the cron route
// (app/api/cron/tick/route.ts) supplies the live per-user state (has the
// user planned today? was the review submitted? etc).

export const NOTIFICATION_KINDS = [
  "plan_day",
  "daily_review",
  "weekly_review",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_LABEL: Record<NotificationKind, string> = {
  plan_day: "Plan today (6:45 AM)",
  daily_review: "Daily review reminder (9:30 PM)",
  weekly_review: "Weekly review required (Friday 5:00 PM)",
};

/**
 * Which notification kinds the hourly cron should check at this local
 * weekday/hour. The cron only runs on the hour, so times in §3.9 that fall
 * mid-hour (6:45, 9:30) are approximated to the nearest hour bucket.
 */
export function kindsScheduledAtHour(weekday: number, hour: number): NotificationKind[] {
  const kinds: NotificationKind[] = [];
  if (hour === 7) kinds.push("plan_day"); // ~6:45 AM
  if (hour === 21) kinds.push("daily_review"); // ~9:30 PM
  if (hour === 17 && weekday === 5) kinds.push("weekly_review"); // Friday 5:00 PM
  return kinds;
}

export type NotificationContent = { title: string; body: string; url: string };

export function notificationContent(kind: NotificationKind): NotificationContent {
  switch (kind) {
    case "plan_day":
      return { title: "1 Billion", body: "Plan today.", url: "/schedule/plan" };
    case "daily_review":
      return { title: "1 Billion", body: "Daily review.", url: "/today" };
    case "weekly_review":
      return { title: "1 Billion", body: "Weekly Review Required.", url: "/week/review" };
  }
}

/** `profiles.notification_prefs` defaults every kind to enabled unless explicitly set to false. */
export function isNotificationEnabled(
  prefs: Record<string, unknown> | null | undefined,
  kind: NotificationKind
): boolean {
  if (!prefs) return true;
  const value = prefs[kind];
  return value !== false;
}
