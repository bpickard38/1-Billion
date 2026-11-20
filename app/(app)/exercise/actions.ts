"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { planWorkouts, workoutPlanSchema } from "@/lib/workout-ai";

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
