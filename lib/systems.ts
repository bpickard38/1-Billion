import { addDays, addMonths, format, getISODay, parseISO, subDays } from "date-fns";

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
 * One month as Monday-first rows of 7. Days outside the month are null.
 * - done:   checked off that day
 * - missed: a scheduled day, before today, not done
 * - off:    not a scheduled day
 * - before: before the system existed
 * - future: today (until done) and later
 */
export function buildMonth(
  month: string,
  doneDates: ReadonlySet<string>,
  daysOfWeek: readonly number[],
  today: string,
  startDate: string
): (HistoryCell | null)[][] {
  const first = parseISO(`${month}-01`);
  const leading = getISODay(first) - 1;
  const cells: (HistoryCell | null)[] = Array(leading).fill(null);
  for (let day = first; format(day, "yyyy-MM") === month; day = addDays(day, 1)) {
    const date = format(day, "yyyy-MM-dd");
    let state: HistoryState;
    if (doneDates.has(date)) state = "done";
    else if (date >= today) state = "future";
    else if (date < startDate) state = "before";
    else if (!daysOfWeek.includes(getISODay(day))) state = "off";
    else state = "missed";
    cells.push({ date, state });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (HistoryCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** "2026-11" -> "2026-10" / "2026-12". */
export function shiftMonth(month: string, by: number): string {
  return format(addMonths(parseISO(`${month}-01`), by), "yyyy-MM");
}

/** A valid "yyyy-MM" no later than today's month, else today's month. */
export function parseMonth(value: unknown, today: string): string {
  const current = today.slice(0, 7);
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return current;
  return value > current ? current : value;
}

export function monthLabel(month: string): string {
  return format(parseISO(`${month}-01`), "MMMM yyyy");
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

/** Prev/next links for a month view at `path` (up to 12 months back, never past today's month). */
export function monthNav(month: string, today: string, path: string) {
  const current = today.slice(0, 7);
  const href = (m: string) => (m === current ? path : `${path}?month=${m}`);
  return {
    title: monthLabel(month),
    prevHref: month > shiftMonth(current, -12) ? href(shiftMonth(month, -1)) : null,
    nextHref: month < current ? href(shiftMonth(month, 1)) : null,
  };
}
