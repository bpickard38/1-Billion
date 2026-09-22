import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import PageTitle from "@/components/PageTitle";
import HeaderStrip from "@/components/today/HeaderStrip";
import TodoList from "@/components/today/TodoList";
import ScheduleSection from "@/components/today/ScheduleSection";
import DailyReviewSheet from "@/components/today/DailyReviewSheet";
import WeekStreakCard from "@/components/today/WeekStreakCard";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { computeProgressPct } from "@/lib/goals";
import { materializeTodaySchedule } from "./actions";
import { getCurrentWeekScore } from "@/app/(app)/week/actions";
import type { AppDatabase } from "@/lib/app-database";

export default async function TodayPage() {
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient<AppDatabase>;

  const profile = await getProfile();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = getLocalDateString(new Date(), timezone);

  await materializeTodaySchedule();

  const weekScorePromise = getCurrentWeekScore();

  const [
    { data: monthGoal },
    { data: dailyEntry },
    { data: todos },
    { data: scheduleBlocks },
  ] = await Promise.all([
    supabase
      .from("goals")
      .select("id, title")
      .eq("level", "month")
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("daily_entries").select("submitted_at").eq("date", today).maybeSingle(),
    db.from("todos").select("id, title, done, sort").eq("date", today).order("sort"),
    supabase
      .from("schedule_blocks")
      .select("id, start_at, end_at, title, category, done")
      .eq("date", today)
      .order("start_at"),
  ]);

  let monthProgressPct: number | null = null;
  if (monthGoal) {
    const [{ count: total }, { count: done }] = await Promise.all([
      supabase
        .from("goals")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", monthGoal.id),
      supabase
        .from("goals")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", monthGoal.id)
        .eq("status", "done"),
    ]);
    monthProgressPct = computeProgressPct(done ?? 0, total ?? 0);
  }

  const weekScore = await weekScorePromise;

  return (
    <>
      <PageTitle>Today</PageTitle>
      <Link href="/schedule/plan" className="mb-4 block rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-bg">Plan today</Link>

      <div className="flex flex-col gap-4">
        <HeaderStrip
          northStar={profile?.north_star ?? null}
          monthGoalTitle={monthGoal?.title ?? null}
          monthProgressPct={monthProgressPct}
        />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">To-do</h2>
          <TodoList todos={todos ?? []} />
        </section>

        <ScheduleSection blocks={scheduleBlocks ?? []} timeZone={timezone} />

        <Link
          href="/skills"
          className="flex items-center justify-center gap-2 rounded-lg border border-accent/60 px-3 py-2 text-sm font-medium text-accent"
        >
          <GraduationCap size={16} />
          Study a skill
        </Link>

        <DailyReviewSheet alreadySubmitted={Boolean(dailyEntry?.submitted_at)} />

        <WeekStreakCard
          score={weekScore.score}
          label={weekScore.label}
          streak={weekScore.streak}
          breakdown={weekScore.breakdown}
        />
      </div>
    </>
  );
}
