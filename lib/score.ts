import { subDays, parseISO, format } from "date-fns";

export type DayTodoStat = { date: string; total: number; done: number };

export type ScoreBreakdownRow = { date: string; label: string; pct: number };

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
 * Weekly score, to-do only (habits were cut 2026-09-21): total to-dos done
 * ÷ total to-dos created that week, across every day. A day with more
 * to-dos counts for more of the score, not weighted separately per day.
 */
export function computeWeekScore(dayStats: readonly DayTodoStat[]): WeekScore {
  const totalTodos = dayStats.reduce((sum, d) => sum + d.total, 0);
  const totalDone = dayStats.reduce((sum, d) => sum + d.done, 0);
  const score = totalTodos > 0 ? Math.round((totalDone / totalTodos) * 100) : 0;

  const breakdown: ScoreBreakdownRow[] = dayStats.map((d) => ({
    date: d.date,
    label: format(parseISO(d.date), "EEE"),
    pct: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0,
  }));

  const ratedRows = breakdown.filter((_, i) => dayStats[i].total > 0);
  const worst = ratedRows.reduce<ScoreBreakdownRow | null>(
    (min, row) => (min === null || row.pct < min.pct ? row : min),
    null
  );
  const biggestIssue = worst && worst.pct < 100 ? `${worst.label} (${worst.pct}%)` : null;

  return { score, label: labelForScore(score), breakdown, biggestIssue };
}

function previousWeekStartString(weekStart: string): string {
  return format(subDays(parseISO(weekStart), 7), "yyyy-MM-dd");
}

const MAX_STREAK_LOOKBACK_WEEKS = 520; // ~10 years, just a sane upper bound

/**
 * Consecutive closed, non-auto-closed weeks ending at `currentWeekStart`.
 * Same shape as before: if the current week isn't closed yet, that doesn't
 * break the streak (and doesn't count) — it just means we start counting
 * from the week before it.
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
