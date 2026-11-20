import { z } from "zod";

// The workout plan's shape and the pure helpers around it. Shared by the
// server (AI + actions) and the Exercise screen.

export const UNITS = ["reps", "seconds", "minutes"] as const;
export type Unit = (typeof UNITS)[number];

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().min(1).max(6),
  low: z.number().int().min(1).max(600),
  high: z.number().int().min(1).max(600),
  unit: z.enum(UNITS),
  /** e.g. "each side", "easy pace"; may be empty */
  note: z.string().max(120),
});
export type Exercise = z.infer<typeof exerciseSchema>;

const daySchema = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string().min(1).max(80),
  minutes: z.number().int().min(0).max(300),
  exercises: z.array(exerciseSchema).max(10),
});
export type WorkoutDayPlan = z.infer<typeof daySchema>;

export const workoutPlanSchema = z.object({
  summary: z.string().max(600),
  days: z.array(daySchema).length(7),
  tips: z.array(z.string().max(300)).max(8),
});
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;

const UNIT_SHORT: Record<Unit, string> = { reps: "reps", seconds: "s", minutes: "min" };

/** { sets: 3, low: 6, high: 8, unit: "reps" } -> "3 × 6-8 reps". One-set work drops the "1 ×". */
export function formatTarget(ex: Pick<Exercise, "sets" | "low" | "high" | "unit">): string {
  const range = ex.low >= ex.high ? `${ex.low}` : `${ex.low}-${ex.high}`;
  const amount = ex.unit === "reps" ? `${range} reps` : `${range} ${UNIT_SHORT[ex.unit]}`;
  return ex.sets === 1 ? amount : `${ex.sets} × ${amount}`;
}

export function unitLabel(unit: Unit): string {
  return UNIT_SHORT[unit];
}

/** A YouTube search for a tutorial, not a guessed video URL (those go stale or don't exist). */
export function tutorialLink(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} tutorial`)}`;
}

export type Progression = { name: string; sets: number; low: number; high: number; newName: string };

/**
 * Apply AI progressions to every day that has the exercise (matched by name,
 * case-insensitive). A non-empty newName swaps in a harder variation.
 * Ranges are clamped and kept low <= high.
 */
export function applyProgressions(plan: WorkoutPlan, updates: readonly Progression[]): WorkoutPlan {
  const byName = new Map(updates.map((u) => [u.name.trim().toLowerCase(), u]));
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((ex) => {
        const u = byName.get(ex.name.trim().toLowerCase());
        if (!u) return ex;
        const low = clamp(u.low, 1, 600);
        const high = Math.max(low, clamp(u.high, 1, 600));
        return { ...ex, name: u.newName.trim() || ex.name, sets: clamp(u.sets, 1, 6), low, high };
      }),
    })),
  };
}

/** Parse what was typed into a set box: a whole number 0-999, else null (empty). */
export function parseSetValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return Number(trimmed);
}
