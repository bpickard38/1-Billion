"use server";

import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import type { Database } from "@/lib/supabase/types";

async function getTimezone(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.from("profiles").select("timezone").maybeSingle();
  return data?.timezone ?? DEFAULT_TIMEZONE;
}

async function todayString(supabase: SupabaseClient<Database>) {
  return getLocalDateString(new Date(), await getTimezone(supabase));
}

async function tomorrowString(supabase: SupabaseClient<Database>) {
  const timeZone = await getTimezone(supabase);
  return getLocalDateString(new Date(Date.now() + 24 * 60 * 60 * 1000), timeZone);
}

export async function setPriority(text: string, goalId: string | null) {
  const supabase = await createClient();
  const date = await todayString(supabase);

  const { error } = await supabase
    .from("daily_entries")
    .upsert(
      { date, priority_text: text, priority_goal_id: goalId },
      { onConflict: "user_id,date" }
    );
  if (error) throw new Error(error.message);

  refresh();
}

export async function toggleHabit(habitId: string, done: boolean) {
  const supabase = await createClient();
  const date = await todayString(supabase);

  const { error } = await supabase
    .from("habit_logs")
    .upsert({ habit_id: habitId, date, done }, { onConflict: "habit_id,date" });
  if (error) throw new Error(error.message);

  refresh();
}

export async function addHabit(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  const { data: lastHabit } = await supabase
    .from("habits")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort = (lastHabit?.sort ?? 0) + 1;

  const { error } = await supabase.from("habits").insert({ name: trimmed, sort });
  if (error) throw new Error(error.message);

  refresh();
}

export type DailyReviewInput = {
  accomplished: string;
  learned: string;
  tomorrowPriority: string;
};

// Submitting the daily review: (a) sets tomorrow's #1 priority, (b) checks
// the "Daily review" habit.
export async function submitDailyReview(input: DailyReviewInput) {
  const supabase = await createClient();
  const date = await todayString(supabase);
  const nextDate = await tomorrowString(supabase);

  const { error: entryError } = await supabase.from("daily_entries").upsert(
    {
      date,
      accomplished: input.accomplished,
      learned: input.learned,
      tomorrow_priority: input.tomorrowPriority,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );
  if (entryError) throw new Error(entryError.message);

  const { data: reviewHabit } = await supabase
    .from("habits")
    .select("id")
    .eq("name", "Daily review")
    .maybeSingle();
  if (reviewHabit) {
    const { error: habitError } = await supabase
      .from("habit_logs")
      .upsert(
        { habit_id: reviewHabit.id, date, done: true },
        { onConflict: "habit_id,date" }
      );
    if (habitError) throw new Error(habitError.message);
  }

  const { error: tomorrowError } = await supabase
    .from("daily_entries")
    .upsert(
      { date: nextDate, priority_text: input.tomorrowPriority },
      { onConflict: "user_id,date" }
    );
  if (tomorrowError) throw new Error(tomorrowError.message);

  refresh();
}
