import { startOfWeek, endOfWeek, startOfMonth, getISODay, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "America/Denver";

// Weeks run Monday -> Sunday (profiles.week_start = 'mon', the only supported value).
const WEEK_STARTS_ON = 1;

/** The local (timeZone) calendar date of `instant`, as "yyyy-MM-dd". */
export function getLocalDateString(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  return format(toZonedTime(instant, timeZone), "yyyy-MM-dd");
}

/** UTC instant marking local 00:00 on the Monday of the week containing `instant`. */
export function getWeekStart(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): Date {
  const zonedWeekStart = startOfWeek(toZonedTime(instant, timeZone), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  return fromZonedTime(zonedWeekStart, timeZone);
}

/** UTC instant marking local 23:59:59.999 on the Sunday of the week containing `instant`. */
export function getWeekEnd(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): Date {
  const zonedWeekEnd = endOfWeek(toZonedTime(instant, timeZone), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  return fromZonedTime(zonedWeekEnd, timeZone);
}

/** The Monday of the week containing `instant`, as "yyyy-MM-dd" — the `weekly_reviews.week_start` key. */
export function getWeekStartDateString(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  return getLocalDateString(getWeekStart(instant, timeZone), timeZone);
}

/** ISO weekday of `instant` in `timeZone`: 1 = Monday ... 7 = Sunday. Matches `habits.days_of_week` and `schedule_templates.weekday`. */
export function getLocalWeekday(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): number {
  return getISODay(toZonedTime(instant, timeZone));
}

/** The local hour (0-23) of `instant` in `timeZone` — the cron tick's hour bucket. */
export function getLocalHour(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): number {
  return toZonedTime(instant, timeZone).getHours();
}

/**
 * UTC instant for local wall-clock `dateString` ("yyyy-MM-dd") + `timeString`
 * ("HH:mm" or "HH:mm:ss", as Postgres `time` columns come back) in `timeZone`.
 * `fromZonedTime` reads its `Date` argument's *host-local* getters as the
 * wall clock to reinterpret — never `Date.UTC` (whose getters would be UTC,
 * silently wrong unless the host itself runs in UTC) — so the components
 * must be built with the local constructor, same as `toZonedTime`'s output
 * that `getWeekStart` feeds back into `fromZonedTime`.
 */
export function localTimeToInstant(
  dateString: string,
  timeString: string,
  timeZone: string = DEFAULT_TIMEZONE
): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute, second] = timeString.split(":").map(Number);
  const wallClock = new Date(year, month - 1, day, hour, minute, second || 0);
  return fromZonedTime(wallClock, timeZone);
}

/** The local "HH:mm" wall-clock time of `instant` in `timeZone`. */
export function instantToLocalTimeString(
  instant: Date | string,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  return format(toZonedTime(new Date(instant), timeZone), "HH:mm");
}

/** Minutes since local midnight of `instant` in `timeZone` — positions a calendar-grid block. */
export function localMinutesSinceMidnight(
  instant: Date | string,
  timeZone: string = DEFAULT_TIMEZONE
): number {
  const zoned = toZonedTime(new Date(instant), timeZone);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** The 1st of the local calendar month containing `instant`, as "yyyy-MM-dd" — the idea-review boundary. */
export function getMonthStartDateString(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const zonedMonthStart = startOfMonth(toZonedTime(instant, timeZone));
  return format(zonedMonthStart, "yyyy-MM-dd");
}

/** True from Friday 5:00 PM local through the end of Sunday — the weekly review gate's window. */
export function isAfterWeeklyReviewCutoff(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE
): boolean {
  const zoned = toZonedTime(instant, timeZone);
  const weekday = getISODay(zoned); // 1 = Monday ... 7 = Sunday
  if (weekday < 5) return false;
  if (weekday > 5) return true;
  return zoned.getHours() >= 17;
}
