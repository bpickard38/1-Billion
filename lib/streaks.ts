import { parseISO, subDays, format } from "date-fns";
import { getISODay } from "date-fns";

const MAX_LOOKBACK_DAYS = 3650; // ~10 years, just a sane upper bound

/**
 * Current streak for a habit: consecutive scheduled days (per `daysOfWeek`)
 * marked done, walking backward from `today`. Non-scheduled days are
 * skipped without breaking the streak. If today is scheduled but not yet
 * done, today doesn't count (or break anything) — the streak reflects
 * yesterday backward, since today isn't over.
 */
export function computeHabitStreak(
  doneDates: ReadonlySet<string>,
  daysOfWeek: readonly number[],
  today: string
): number {
  let streak = 0;

  const todayWeekday = getISODay(parseISO(today));
  if (daysOfWeek.includes(todayWeekday) && doneDates.has(today)) {
    streak++;
  }

  let cursor = parseISO(today);
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    cursor = subDays(cursor, 1);
    const dateString = format(cursor, "yyyy-MM-dd");
    const weekday = getISODay(cursor);
    if (!daysOfWeek.includes(weekday)) continue;

    if (doneDates.has(dateString)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
