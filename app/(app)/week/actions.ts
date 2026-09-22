"use server";

import { cache } from "react";
import { refresh } from "next/cache";
import { addDays, parseISO, format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getWeekStartDateString, getWeekEnd, getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { computeWeekScore, computeReviewStreak, labelForScore, type ScoreBreakdownRow, type DayTodoStat } from "@/lib/score";
import type { Database, Json } from "@/lib/supabase/types";
import type { AppDatabase } from "@/lib/app-database";

async function getTimezone() {
  const profile = await getProfile();
  return profile?.timezone ?? DEFAULT_TIMEZONE;
}

function weekEndString(weekStart: string): string {
  return format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd");
}

async function computeLiveWeekScore(supabase: SupabaseClient<Database>, weekStart: string, weekEnd: string) {
  const db = supabase as unknown as SupabaseClient<AppDatabase>;
  const { data: todos } = await db.from("todos").select("date, done").gte("date", weekStart).lte("date", weekEnd);

  const byDate = new Map<string, DayTodoStat>();
  for (const todo of todos ?? []) {
    const stat = byDate.get(todo.date) ?? { date: todo.date, total: 0, done: 0 };
    stat.total++;
    if (todo.done) stat.done++;
    byDate.set(todo.date, stat);
  }

  return computeWeekScore([...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)));
}

export type CurrentWeekScore = {
  weekStart: string;
  score: number;
  label: string;
  breakdown: ScoreBreakdownRow[];
  biggestIssue: string | null;
  streak: number;
  closed: boolean;
};

// Single source of truth for "what is this week's score/streak right now" —
// used by both the Week tab and Today's header, so they never disagree.
// cache()-wrapped so the layout and the page calling this within the same
// request share one set of queries instead of running them twice.
const getCurrentWeekScoreCached = cache(async (): Promise<CurrentWeekScore> => {
  const supabase = await createClient();
  const timeZone = await getTimezone();
  const now = new Date();
  const weekStart = getWeekStartDateString(now, timeZone);
  const weekEnd = getLocalDateString(getWeekEnd(now, timeZone), timeZone);

  const [{ data: existingReview }, { data: closedWeeks }] = await Promise.all([
    supabase.from("weekly_reviews").select("score, breakdown, biggest_issue, closed_at").eq("week_start", weekStart).maybeSingle(),
    supabase.from("weekly_reviews").select("week_start").eq("auto_closed", false).not("closed_at", "is", null),
  ]);

  const closedSet = new Set((closedWeeks ?? []).map((w) => w.week_start));
  const streak = computeReviewStreak(closedSet, weekStart);

  if (existingReview?.closed_at) {
    const score = existingReview.score ?? 0;
    return {
      weekStart,
      score,
      label: labelForScore(score),
      breakdown: (existingReview.breakdown as unknown as ScoreBreakdownRow[]) ?? [],
      biggestIssue: existingReview.biggest_issue ?? null,
      streak,
      closed: true,
    };
  }

  const { score, label, breakdown, biggestIssue } = await computeLiveWeekScore(supabase, weekStart, weekEnd);
  return { weekStart, score, label, breakdown, biggestIssue, streak, closed: false };
});

export async function getCurrentWeekScore(): Promise<CurrentWeekScore> {
  return getCurrentWeekScoreCached();
}

export type ReviewAnswers = {
  accomplished: string;
  failed: string;
  why: string;
  customerInsight: string;
  wastedTimeOn: string;
  bottleneck: string;
  nextWeekTop3: string;
};

export async function saveReviewDraft(weekStart: string, answers: ReviewAnswers) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_reviews")
    .upsert({ week_start: weekStart, answers: answers as unknown as Json }, { onConflict: "user_id,week_start" });
  if (error) throw new Error(error.message);
}

// goals has unique(user_id, level, title) (Phase 1) — a "next week's top 3"
// title could collide with a goal from some earlier week. Rare, but rather
// than fail the whole review submission, disambiguate with the week and retry once.
async function insertWeekGoals(
  supabase: SupabaseClient<Database>,
  rows: { level: string; parent_id: string | null; title: string; starts_on: string; ends_on: string; sort: number }[]
) {
  const { error } = await supabase.from("goals").insert(rows);
  if (!error) return;
  if (error.code !== "23505") throw new Error(error.message);

  const disambiguated = rows.map((r) => ({ ...r, title: `${r.title} (${r.starts_on})` }));
  const { error: retryError } = await supabase.from("goals").insert(disambiguated);
  if (retryError) throw new Error(retryError.message);
}

export async function submitReview(weekStart: string, answers: ReviewAnswers) {
  const supabase = await createClient();
  const weekEnd = weekEndString(weekStart);

  const { score, breakdown, biggestIssue } = await computeLiveWeekScore(supabase, weekStart, weekEnd);

  const { error: reviewError } = await supabase.from("weekly_reviews").upsert(
    {
      week_start: weekStart,
      answers: answers as unknown as Json,
      score,
      breakdown: breakdown as unknown as Json,
      biggest_issue: biggestIssue,
      closed_at: new Date().toISOString(),
      auto_closed: false,
    },
    { onConflict: "user_id,week_start" }
  );
  if (reviewError) throw new Error(reviewError.message);

  const topThreeTitles = answers.nextWeekTop3
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (topThreeTitles.length > 0) {
    const nextWeekStart = format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd");
    const nextWeekEnd = weekEndString(nextWeekStart);

    const { data: monthGoal } = await supabase
      .from("goals")
      .select("id")
      .eq("level", "month")
      .eq("status", "active")
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle();

    await insertWeekGoals(
      supabase,
      topThreeTitles.map((title, i) => ({
        level: "week",
        parent_id: monthGoal?.id ?? null,
        title,
        starts_on: nextWeekStart,
        ends_on: nextWeekEnd,
        sort: i,
      }))
    );
  }

  refresh();
}

// Stand-in for Phase 9's daily cron route: closes any past week that has no
// review yet, scoring it from that week's to-dos, with auto_closed = true.
export async function closeUnreviewedWeeks() {
  const supabase = await createClient();
  const timeZone = await getTimezone();
  const currentWeekStart = getWeekStartDateString(new Date(), timeZone);

  const { data: reviewedWeeks } = await supabase
    .from("weekly_reviews")
    .select("week_start")
    .not("closed_at", "is", null);
  const reviewedSet = new Set((reviewedWeeks ?? []).map((w) => w.week_start));

  const LOOKBACK_WEEKS = 52;
  let cursor = currentWeekStart;
  let closedCount = 0;

  for (let i = 0; i < LOOKBACK_WEEKS; i++) {
    cursor = format(addDays(parseISO(cursor), -7), "yyyy-MM-dd");
    if (reviewedSet.has(cursor)) continue;

    const weekEnd = weekEndString(cursor);
    const { score, breakdown, biggestIssue } = await computeLiveWeekScore(supabase, cursor, weekEnd);

    const { error } = await supabase.from("weekly_reviews").upsert(
      {
        week_start: cursor,
        score,
        breakdown: breakdown as unknown as Json,
        biggest_issue: biggestIssue,
        closed_at: new Date().toISOString(),
        auto_closed: true,
      },
      { onConflict: "user_id,week_start" }
    );
    if (error) throw new Error(error.message);
    closedCount++;
  }

  refresh();
  return closedCount;
}
