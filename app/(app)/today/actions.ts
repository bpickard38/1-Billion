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
import {
  syncBlockToGoogle,
  deleteBlockFromGoogle,
  createRecurringSeries,
  deleteRecurringSeries,
  updateSeriesAll,
} from "@/lib/google";
import type { Database } from "@/lib/supabase/types";
import type { AppDatabase } from "@/lib/app-database";

async function getTimezone(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.from("profiles").select("timezone").maybeSingle();
  return data?.timezone ?? DEFAULT_TIMEZONE;
}

async function todayString(supabase: SupabaseClient<Database>) {
  return getLocalDateString(new Date(), await getTimezone(supabase));
}

function appDb(supabase: SupabaseClient<Database>) {
  return supabase as unknown as SupabaseClient<AppDatabase>;
}

export async function addTodo(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  const date = await todayString(supabase);
  const db = appDb(supabase);

  const { data: last } = await db
    .from("todos")
    .select("sort")
    .eq("date", date)
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort = (last?.sort ?? 0) + 1;

  const { error } = await db.from("todos").insert({ date, title: trimmed, sort });
  if (error) throw new Error(error.message);

  refresh();
}

export async function toggleTodo(todoId: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await appDb(supabase).from("todos").update({ done }).eq("id", todoId);
  if (error) throw new Error(error.message);

  refresh();
}

export async function editTodo(todoId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  const { error } = await appDb(supabase).from("todos").update({ title: trimmed }).eq("id", todoId);
  if (error) throw new Error(error.message);

  refresh();
}

export async function deleteTodo(todoId: string) {
  const supabase = await createClient();
  const { error } = await appDb(supabase).from("todos").delete().eq("id", todoId);
  if (error) throw new Error(error.message);

  refresh();
}

// Swaps `sort` with the neighbor above/below — #1 (lowest sort) is today's priority.
export async function moveTodo(todoId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const date = await todayString(supabase);
  const db = appDb(supabase);

  const { data: todos } = await db.from("todos").select("id, sort").eq("date", date).order("sort");
  if (!todos) return;

  const index = todos.findIndex((t) => t.id === todoId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= todos.length) return;

  const current = todos[index];
  const other = todos[swapWith];
  const { error: firstError } = await db.from("todos").update({ sort: other.sort }).eq("id", current.id);
  if (firstError) throw new Error(firstError.message);
  const { error: secondError } = await db.from("todos").update({ sort: current.sort }).eq("id", other.id);
  if (secondError) throw new Error(secondError.message);

  refresh();
}

export type DailyReviewInput = {
  accomplished: string;
  learned: string;
};

export async function submitDailyReview(input: DailyReviewInput) {
  const supabase = await createClient();
  const date = await todayString(supabase);

  const { error } = await supabase.from("daily_entries").upsert(
    {
      date,
      accomplished: input.accomplished,
      learned: input.learned,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );
  if (error) throw new Error(error.message);

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
  // ISO weekdays (1=Mon..7=Sun) this block repeats on. `undefined` means
  // "don't touch series membership" (a drag, or a plain edit that never
  // opened the Repeat picker) — a non-empty array creates/replaces the
  // series; an explicit empty array means the Repeat picker was cleared,
  // i.e. "take this out of its series." Undefined and [] must stay distinct
  // (see below) or a drag on a series instance deletes the whole series.
  repeatDays?: number[];
  // Required (defaults to "this") when editing a block that's already part
  // of a series without changing which days it repeats on.
  editScope?: "this" | "all";
};

function sameDaySet(a: readonly number[] | null | undefined, b: readonly number[] | null | undefined): boolean {
  const sortedA = [...(a ?? [])].sort((x, y) => x - y);
  const sortedB = [...(b ?? [])].sort((x, y) => x - y);
  return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

export async function upsertScheduleBlock(input: ScheduleBlockInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const timeZone = await getTimezone(supabase);
  const date = await todayString(supabase);
  const startAt = localTimeToInstant(date, input.startTime, timeZone).toISOString();
  const endAt = localTimeToInstant(date, input.endTime, timeZone).toISOString();
  // See the ScheduleBlockInput comment: undefined vs [] must stay distinct.
  const repeatDaysTouched = input.repeatDays !== undefined;
  const repeatDays = repeatDaysTouched && input.repeatDays!.length > 0 ? input.repeatDays! : null;
  const repeatExplicitlyCleared = repeatDaysTouched && input.repeatDays!.length === 0;

  let existing: {
    google_event_id: string | null;
    google_recurring_event_id: string | null;
    recurrence_days: number[] | null;
  } | null = null;
  if (input.id) {
    const { data } = await supabase
      .from("schedule_blocks")
      .select("google_event_id, google_recurring_event_id, recurrence_days")
      .eq("id", input.id)
      .maybeSingle();
    existing = data;
  }

  // Turning repeat on for a new block, upgrading a plain block into a
  // series, or changing which days an existing series repeats on: always
  // (re)creates the series from scratch rather than reconciling a partial
  // RRULE edit — simpler, and matches how rarely this actually happens.
  const daysChanged = repeatDays !== null && !sameDaySet(repeatDays, existing?.recurrence_days);
  if (repeatDays && (!existing?.google_recurring_event_id || daysChanged)) {
    if (existing?.google_recurring_event_id) {
      await deleteRecurringSeries(supabase, user.id, existing.google_recurring_event_id);
    } else if (input.id) {
      await deleteScheduleBlock(input.id);
    }
    await createRecurringSeries(
      supabase,
      user.id,
      { title: input.title, category: input.category, startTime: input.startTime, endTime: input.endTime, days: repeatDays },
      timeZone
    );
    refresh();
    return;
  }

  // Repeat was explicitly turned off (Repeat picker cleared) on a block
  // that's part of a series: drop the series, then fall through to create a
  // fresh plain single block below. A drag or an untouched-picker edit
  // (repeatDaysTouched === false) must NOT hit this — see the type comment.
  if (repeatExplicitlyCleared && existing?.google_recurring_event_id) {
    await deleteRecurringSeries(supabase, user.id, existing.google_recurring_event_id);
    existing = null;
  }

  // Editing an existing series without touching the day picker: "this
  // event" falls through to the single-row path below (Google detaches it
  // into an exception automatically when pushed by its own instance id);
  // "all events" patches the master and every local row, then returns.
  if (existing?.google_recurring_event_id) {
    if ((input.editScope ?? "this") === "all") {
      await updateSeriesAll(
        supabase,
        user.id,
        existing.google_recurring_event_id,
        { title: input.title, category: input.category, startTime: input.startTime, endTime: input.endTime },
        timeZone
      );
      refresh();
      return;
    }
  }

  let blockId = input.id;
  if (blockId) {
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

  // Push direction: every block syncs back to Google now, including
  // personal (non-app-created) primary-calendar events — editing one here
  // is a real edit to the real event, same as dragging it in Google
  // Calendar itself.
  await syncBlockToGoogle(supabase, {
    id: blockId!,
    title: input.title,
    start_at: startAt,
    end_at: endAt,
    category: input.category,
    google_event_id: existing?.google_event_id ?? null,
  });

  refresh();
}

export async function deleteScheduleBlock(blockId: string, editScope?: "this" | "all") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("schedule_blocks")
    .select("google_event_id, google_recurring_event_id")
    .eq("id", blockId)
    .maybeSingle();

  if (existing?.google_recurring_event_id && (editScope ?? "this") === "all") {
    await deleteRecurringSeries(supabase, user.id, existing.google_recurring_event_id);
    refresh();
    return;
  }

  const { error } = await supabase.from("schedule_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);

  await deleteBlockFromGoogle(supabase, existing?.google_event_id ?? null);

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
