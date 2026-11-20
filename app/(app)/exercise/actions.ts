"use server";

import { refresh } from "next/cache";
import { getISODay, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { planWorkouts, progressWorkout } from "@/lib/workout-ai";
import { applyProgressions, UNITS, workoutPlanSchema, type Unit } from "@/lib/workout";

type Result = { error: string } | { ok: true };

async function claim(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc("claim_ai");
  return Boolean(data);
}

/** Build a fresh plan from goals, schedule and notes, and save all of it. */
export async function generatePlan(input: { goals: string; schedule: string; notes: string }): Promise<Result> {
  const goals = input.goals.trim().slice(0, 2000);
  const schedule = input.schedule.trim().slice(0, 1000);
  const notes = input.notes.trim().slice(0, 1000);
  if (!goals) return { error: "Add at least one goal." };

  const supabase = await createClient();
  if (!(await claim(supabase))) return { error: "Give it a few seconds before asking the AI again." };

  try {
    const plan = await planWorkouts({ goals, schedule, notes });
    const { error } = await supabase
      .from("workout_plans")
      .upsert({ goals, schedule, notes, plan }, { onConflict: "user_id" });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The AI request failed." };
  }
  refresh();
  return { ok: true };
}

/** Apply one change ("make Monday shorter") to the saved plan. */
export async function changePlan(request: string): Promise<Result> {
  const change = request.trim().slice(0, 500);
  if (!change) return { error: "Say what to change." };

  const supabase = await createClient();
  const { data: row } = await supabase.from("workout_plans").select("goals, schedule, notes, plan").maybeSingle();
  const current = workoutPlanSchema.safeParse(row?.plan);
  if (!row || !current.success) return { error: "Make a plan first." };
  if (!(await claim(supabase))) return { error: "Give it a few seconds before asking the AI again." };

  try {
    const { goals, schedule, notes } = row;
    const plan = await planWorkouts({ goals, schedule, notes, current: current.data, change });
    const { error } = await supabase
      .from("workout_plans")
      .upsert({ goals, schedule, notes, plan }, { onConflict: "user_id" });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The AI request failed." };
  }
  refresh();
  return { ok: true };
}

async function todayString() {
  const profile = await getProfile();
  return getLocalDateString(new Date(), profile?.timezone ?? DEFAULT_TIMEZONE);
}

export type SetEntry = { name: string; unit: Unit; results: (number | null)[] };

function clean(entry: SetEntry) {
  return {
    exercise: entry.name.trim().slice(0, 120),
    unit: (UNITS as readonly string[]).includes(entry.unit) ? entry.unit : "reps",
    results: entry.results
      .slice(0, 6)
      .map((v) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 999 ? v : null)),
  };
}

/** Save one exercise's sets for today. Called as each box is filled in. */
export async function logExercise(entry: SetEntry) {
  const row = clean(entry);
  if (!row.exercise) return;
  const supabase = await createClient();
  const date = await todayString();
  const { error } = await supabase
    .from("workout_logs")
    .upsert({ date, ...row }, { onConflict: "user_id,date,exercise" });
  if (error) throw new Error(error.message);
}

/**
 * Save today's sets, then have the AI progress the logged exercises
 * (higher range, more sets or a harder variation) everywhere in the plan.
 */
export async function finishWorkout(entries: SetEntry[]): Promise<Result> {
  const rows = entries.map(clean).filter((r) => r.exercise && r.results.some((v) => v !== null));
  if (rows.length === 0) return { error: "Log at least one set first." };

  const supabase = await createClient();
  const date = await todayString();
  const { error: saveError } = await supabase
    .from("workout_logs")
    .upsert(rows.map((r) => ({ date, ...r })), { onConflict: "user_id,date,exercise" });
  if (saveError) return { error: saveError.message };

  const { data: row } = await supabase.from("workout_plans").select("goals, schedule, notes, plan").maybeSingle();
  const parsed = workoutPlanSchema.safeParse(row?.plan);
  if (!row || !parsed.success) return { error: "Make a plan first." };
  const plan = parsed.data;

  const weekday = getISODay(parseISO(date));
  const todays = plan.days.find((d) => d.day === weekday)?.exercises ?? [];
  const done = new Map(rows.map((r) => [r.exercise.toLowerCase(), r.results]));
  const today = todays
    .filter((ex) => done.has(ex.name.toLowerCase()))
    .map((ex) => ({ name: ex.name, sets: ex.sets, low: ex.low, high: ex.high, unit: ex.unit, done: done.get(ex.name.toLowerCase())! }));
  if (today.length === 0) return { error: "None of today's exercises have sets logged." };

  const { data: history } = await supabase
    .from("workout_logs")
    .select("date, exercise, unit, results")
    .in("exercise", today.map((t) => t.name))
    .lt("date", date)
    .order("date", { ascending: false })
    .limit(40);

  if (!(await claim(supabase))) return { error: "Give it a few seconds before asking the AI again." };

  try {
    const { note, updates } = await progressWorkout({
      today,
      history: (history ?? []).map((h) => ({ date: h.date, name: h.exercise, unit: h.unit, done: h.results })),
    });
    const { goals, schedule, notes } = row;
    const { error } = await supabase.from("workout_plans").upsert(
      { goals, schedule, notes, plan: applyProgressions(plan, updates), progress_note: note, progressed_on: date },
      { onConflict: "user_id" }
    );
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The AI request failed." };
  }
  refresh();
  return { ok: true };
}
