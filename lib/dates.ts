import { startOfWeek, endOfWeek, format } from "date-fns";
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
