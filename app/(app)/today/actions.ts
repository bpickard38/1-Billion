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

export async function adjustMetric(metricId: string, delta: number) {
  const supabase = await createClient();
  const date = await todayString(supabase);

  const { data: existing } = await supabase
    .from("metric_logs")
    .select("value")
    .eq("metric_id", metricId)
    .eq("date", date)
    .maybeSingle();

  const value = Math.max(0, (existing?.value ?? 0) + delta);

  const { error } = await supabase
    .from("metric_logs")
    .upsert({ metric_id: metricId, date, value }, { onConflict: "metric_id,date" });
  if (error) throw new Error(error.message);

  refresh();
}

export async function setMetricValue(metricId: string, value: number) {
  const supabase = await createClient();
  const date = await todayString(supabase);

  const { error } = await supabase
    .from("metric_logs")
    .upsert(
      { metric_id: metricId, date, value: Math.max(0, value) },
      { onConflict: "metric_id,date" }
    );
  if (error) throw new Error(error.message);

  refresh();
}

export type DailyReviewInput = {
  accomplished: string;
  learned: string;
  tomorrowPriority: string;
  hours: { metricId: string; value: number }[];
};

// Submitting the daily review: (a) logs the hours-type metrics for today,
// (b) sets tomorrow's #1 priority, (c) checks the "Daily review" habit.
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

  if (input.hours.length > 0) {
    const { error: hoursError } = await supabase
      .from("metric_logs")
      .upsert(
        input.hours.map((h) => ({ metric_id: h.metricId, date, value: h.value })),
        { onConflict: "metric_id,date" }
      );
    if (hoursError) throw new Error(hoursError.message);
  }

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
