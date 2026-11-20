import { addDays, format, getISODay, parseISO, startOfWeek, subDays, subWeeks } from "date-fns";

export const TIMES_OF_DAY = ["morning", "afternoon", "evening"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export const TIME_LABELS: Record<TimeOfDay | "anytime", string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

export function isTimeOfDay(value: string | null | undefined): value is TimeOfDay {
  return (TIMES_OF_DAY as readonly string[]).includes(value ?? "");
}

export const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** [1,2,3,4,5] -> "Weekdays", [1,3,5] -> "Mon, Wed, Fri". ISO weekdays. */
export function formatDays(days: readonly number[]): string {
  const key = [...new Set(days)].sort((a, b) => a - b).join(",");
  if (key === "1,2,3,4,5,6,7") return "Every day";
  if (key === "1,2,3,4,5") return "Weekdays";
  if (key === "6,7") return "Weekends";
  return key
    .split(",")
    .filter(Boolean)
    .map((d) => DAY_NAMES[Number(d) - 1])
    .join(", ");
}

export type HistoryState = "done" | "missed" | "off" | "future" | "before";
export type HistoryCell = { date: string; state: HistoryState };

/**
 * A GitHub-style grid: `weeks` columns (oldest first), each Monday..Sunday.
 * - done:   checked off that day
 * - missed: scheduled, in the past, not done (today counts as missed only once it's over, so it's "future" until done)
 * - off:    not a scheduled day
 * - before: before the system existed
 */
export function buildHistory(
  doneDates: ReadonlySet<string>,
  daysOfWeek: readonly number[],
  today: string,
  startDate: string,
  weeks = 16
): HistoryCell[][] {
  const firstMonday = subWeeks(startOfWeek(parseISO(today), { weekStartsOn: 1 }), weeks - 1);
  const grid: HistoryCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: HistoryCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(firstMonday, w * 7 + d);
      const date = format(day, "yyyy-MM-dd");
      let state: HistoryState;
      if (doneDates.has(date)) state = "done";
      else if (date >= today) state = "future";
      else if (date < startDate) state = "before";
      else if (!daysOfWeek.includes(getISODay(day))) state = "off";
      else state = "missed";
      column.push({ date, state });
    }
    grid.push(column);
  }
  return grid;
}

/**
 * Share of scheduled days done over the last `days` days (today included
 * only if it's already done). Null when there were no scheduled days yet.
 */
export function completionRate(
  doneDates: ReadonlySet<string>,
  daysOfWeek: readonly number[],
  today: string,
  startDate: string,
  days = 30
): { done: number; scheduled: number; pct: number } | null {
  let done = 0;
  let scheduled = 0;
  for (let i = 0; i < days; i++) {
    const day = subDays(parseISO(today), i);
    const date = format(day, "yyyy-MM-dd");
    if (date < startDate) break;
    const isDone = doneDates.has(date);
    if (date === today && !isDone) continue;
    if (!daysOfWeek.includes(getISODay(day)) && !isDone) continue;
    scheduled++;
    if (isDone) done++;
  }
  if (scheduled === 0) return null;
  return { done, scheduled, pct: Math.round((done / scheduled) * 100) };
}
