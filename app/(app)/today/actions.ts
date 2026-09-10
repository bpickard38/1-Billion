"use server";

import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  getLocalDateString,
  getLocalWeekday,
  localTimeToInstant,
  instantToLocalTimeString,
  DEFAULT_TIMEZONE,
} from "@/lib/dates";
import { materializeBlocks } from "@/lib/schedule";
import { syncBlockToGoogle, deleteBlockFromGoogle } from "@/lib/google";
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

// Called from the Today page on every load. Idempotent: only inserts
// today's blocks from the weekday template the first time today is opened.
export async function materializeTodaySchedule() {
  const supabase = await createClient();
  const timeZone = await getTimezone(supabase);
  const date = await todayString(supabase);
  const weekday = getLocalWeekday(new Date(), timeZone);

  const { count } = await supabase
    .from("schedule_blocks")
    .select("id", { count: "exact", head: true })
    .eq("date", date);
  if (count) return;

  const { data: templates } = await supabase
    .from("schedule_templates")
    .select("start_time, end_time, title, category")
    .eq("weekday", weekday)
    .order("sort");
  if (!templates || templates.length === 0) return;

  const { error } = await supabase
    .from("schedule_blocks")
    .insert(materializeBlocks(templates, date, timeZone));
  if (error) throw new Error(error.message);
}

export async function toggleScheduleBlockDone(blockId: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_blocks").update({ done }).eq("id", blockId);
  if (error) throw new Error(error.message);

  refresh();
}

export type ScheduleBlockInput = {
  id?: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
};

export async function upsertScheduleBlock(input: ScheduleBlockInput) {
  const supabase = await createClient();
  const timeZone = await getTimezone(supabase);
  const date = await todayString(supabase);
  const startAt = localTimeToInstant(date, input.startTime, timeZone).toISOString();
  const endAt = localTimeToInstant(date, input.endTime, timeZone).toISOString();

  let blockId = input.id;
  let existingGoogleEventId: string | null = null;
  let existingSource: string | null = null;

  if (blockId) {
    const { data: existing } = await supabase
      .from("schedule_blocks")
      .select("google_event_id, source")
      .eq("id", blockId)
      .maybeSingle();
    existingGoogleEventId = existing?.google_event_id ?? null;
    existingSource = existing?.source ?? null;

    const { error } = await supabase
      .from("schedule_blocks")
      .update({ start_at: startAt, end_at: endAt, title: input.title, category: input.category })
      .eq("id", blockId);
    if (error) throw new Error(error.message);
  } else {
    const { data: inserted, error } = await supabase
      .from("schedule_blocks")
      .insert({
        date,
        start_at: startAt,
        end_at: endAt,
        title: input.title,
        category: input.category,
        source: "manual",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    blockId = inserted.id;
  }

  // Push direction (Phase 10): read-only primary-calendar imports never
  // reach here since the day view doesn't open an editor for them — this
  // check is just a defensive backstop.
  if (existingSource !== "google_primary") {
    await syncBlockToGoogle(supabase, {
      id: blockId!,
      title: input.title,
      start_at: startAt,
      end_at: endAt,
      category: input.category,
      google_event_id: existingGoogleEventId,
    });
  }

  refresh();
}

export async function deleteScheduleBlock(blockId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("schedule_blocks")
    .select("google_event_id, source")
    .eq("id", blockId)
    .maybeSingle();

  const { error } = await supabase.from("schedule_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);

  if (existing?.source !== "google_primary") {
    await deleteBlockFromGoogle(supabase, existing?.google_event_id ?? null);
  }

  refresh();
}

// Replaces today's weekday template with today's actual blocks.
export async function saveTodayAsTemplate() {
  const supabase = await createClient();
  const timeZone = await getTimezone(supabase);
  const date = await todayString(supabase);
  const weekday = getLocalWeekday(new Date(), timeZone);

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("start_at, end_at, title, category")
    .eq("date", date)
    .order("start_at");

  const { error: deleteError } = await supabase
    .from("schedule_templates")
    .delete()
    .eq("weekday", weekday);
  if (deleteError) throw new Error(deleteError.message);

  if (blocks && blocks.length > 0) {
    const rows = blocks.map((b, i) => ({
      weekday,
      start_time: instantToLocalTimeString(b.start_at, timeZone),
      end_time: instantToLocalTimeString(b.end_at, timeZone),
      title: b.title,
      category: b.category,
      sort: i + 1,
    }));
    const { error: insertError } = await supabase.from("schedule_templates").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  refresh();
}
