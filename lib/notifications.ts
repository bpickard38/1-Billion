// Which push notifications exist, when the hourly cron should consider
// sending each one, and what they say. Pure/unit-tested — the cron route
// (app/api/cron/tick/route.ts) supplies the live per-user state (has the
// user set a priority? is a habit unchecked? etc).

export const NOTIFICATION_KINDS = [
  "today_priority",
  "uncomfortable_rep",
  "daily_review",
  "weekly_review",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_LABEL: Record<NotificationKind, string> = {
  today_priority: "Set today's ONE thing (6:45 AM)",
  uncomfortable_rep: "Uncomfortable rep check-in (4:00 PM weekdays)",
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
  if (hour === 7) kinds.push("today_priority"); // ~6:45 AM
  if (hour === 16 && weekday >= 1 && weekday <= 5) kinds.push("uncomfortable_rep"); // 4:00 PM weekdays
  if (hour === 21) kinds.push("daily_review"); // ~9:30 PM
  if (hour === 17 && weekday === 5) kinds.push("weekly_review"); // Friday 5:00 PM
  return kinds;
}

export type NotificationContent = { title: string; body: string; url: string };

export function notificationContent(kind: NotificationKind): NotificationContent {
  switch (kind) {
    case "today_priority":
      return { title: "1 Billion", body: "Set today's ONE thing.", url: "/today" };
    case "uncomfortable_rep":
      return { title: "1 Billion", body: "Uncomfortable rep done?", url: "/today" };
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
