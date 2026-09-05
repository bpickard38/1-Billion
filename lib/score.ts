import { subDays, parseISO, format } from "date-fns";

export type HabitWeekStat = {
  habitId: string;
  name: string;
  scheduledDays: number;
  doneDays: number;
};

export type ScoreBreakdownRow = { habitId: string; name: string; pct: number };

export type WeekScore = {
  score: number;
  label: string;
  breakdown: ScoreBreakdownRow[];
  biggestIssue: string | null;
};

export function labelForScore(score: number): string {
  if (score >= 90) return "Excellent week";
  if (score >= 75) return "Strong week";
  if (score >= 50) return "Uneven week";
  return "Rough week";
}

/**
 * Weekly score, habit-only (metrics were cut 2026-09-05): total habit-days
 * done ÷ total habit-days scheduled across every active habit that week —
 * habits scheduled more often count for more of the score, not weighted
 * separately. `scheduledDays` per habit is `days_of_week.length`, since
 * every ISO weekday appears exactly once in any Monday-Sunday week.
 */
export function computeWeekScore(habitStats: readonly HabitWeekStat[]): WeekScore {
  const totalScheduled = habitStats.reduce((sum, h) => sum + h.scheduledDays, 0);
  const totalDone = habitStats.reduce((sum, h) => sum + h.doneDays, 0);
  const score = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0;

  const breakdown: ScoreBreakdownRow[] = habitStats.map((h) => ({
    habitId: h.habitId,
    name: h.name,
    pct: h.scheduledDays > 0 ? Math.round((h.doneDays / h.scheduledDays) * 100) : 0,
  }));

  const ratedRows = breakdown.filter((_, i) => habitStats[i].scheduledDays > 0);
  const worst = ratedRows.reduce<ScoreBreakdownRow | null>(
    (min, row) => (min === null || row.pct < min.pct ? row : min),
    null
  );
  const biggestIssue = worst && worst.pct < 100 ? `${worst.name} (${worst.pct}%)` : null;

  return { score, label: labelForScore(score), breakdown, biggestIssue };
}

function previousWeekStartString(weekStart: string): string {
  return format(subDays(parseISO(weekStart), 7), "yyyy-MM-dd");
}

const MAX_STREAK_LOOKBACK_WEEKS = 520; // ~10 years, just a sane upper bound

/**
 * Consecutive closed, non-auto-closed weeks ending at `currentWeekStart`.
 * Same shape as `computeHabitStreak`: if the current week isn't closed yet,
 * that doesn't break the streak (and doesn't count) — it just means we
 * start counting from the week before it.
 */
export function computeReviewStreak(
  closedWeekStarts: ReadonlySet<string>,
  currentWeekStart: string
): number {
  let streak = 0;

  if (closedWeekStarts.has(currentWeekStart)) {
    streak++;
  }

  let cursor = previousWeekStartString(currentWeekStart);
  for (let i = 0; i < MAX_STREAK_LOOKBACK_WEEKS; i++) {
    if (!closedWeekStarts.has(cursor)) break;
    streak++;
    cursor = previousWeekStartString(cursor);
  }

  return streak;
}
