import { parseISO, subDays, format } from "date-fns";
import PageTitle from "@/components/PageTitle";
import HeaderStrip from "@/components/today/HeaderStrip";
import PriorityCard from "@/components/today/PriorityCard";
import HabitList from "@/components/today/HabitList";
import AddHabitButton from "@/components/today/AddHabitButton";
import ScheduleSection from "@/components/today/ScheduleSection";
import DailyReviewSheet from "@/components/today/DailyReviewSheet";
import FollowUpsLine from "@/components/today/FollowUpsLine";
import IdeaReviewCard from "@/components/today/IdeaReviewCard";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, getLocalWeekday, DEFAULT_TIMEZONE } from "@/lib/dates";
import { computeHabitStreak } from "@/lib/streaks";
import { getGoalChain, computeProgressPct } from "@/lib/goals";
import { materializeTodaySchedule } from "./actions";
import { getCurrentWeekScore } from "@/app/(app)/week/actions";
import { getFollowUpDueCount } from "@/app/(app)/crm/actions";
import { getIdeasToReview } from "@/app/(app)/more/ideas/actions";

const STREAK_LOOKBACK_DAYS = 370;

export default async function TodayPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, north_star")
    .maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = getLocalDateString(new Date(), timezone);
  const weekday = getLocalWeekday(new Date(), timezone);
  const streakCutoff = format(subDays(parseISO(today), STREAK_LOOKBACK_DAYS), "yyyy-MM-dd");

  await materializeTodaySchedule();

  const weekScorePromise = getCurrentWeekScore();
  const followUpCountPromise = getFollowUpDueCount();
  const ideasToReviewPromise = getIdeasToReview();

  const [
    { data: quarterGoal },
    { data: pickableGoals },
    { data: dailyEntry },
    { data: habits },
    { data: todayLogs },
    { data: doneLogHistory },
    { data: scheduleBlocks },
  ] = await Promise.all([
    supabase
      .from("goals")
      .select("id, title")
      .eq("level", "quarter")
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("goals")
      .select("id, title, level")
      .in("level", ["week", "month"])
      .eq("status", "active")
      .order("level")
      .order("sort"),
    supabase.from("daily_entries").select("*").eq("date", today).maybeSingle(),
    supabase
      .from("habits")
      .select("id, name, days_of_week")
      .eq("active", true)
      .contains("days_of_week", [weekday])
      .order("sort"),
    supabase.from("habit_logs").select("habit_id, done").eq("date", today),
    supabase
      .from("habit_logs")
      .select("habit_id, date")
      .eq("done", true)
      .gte("date", streakCutoff),
    supabase
      .from("schedule_blocks")
      .select("id, start_at, end_at, title, category, done")
      .eq("date", today)
      .order("start_at"),
  ]);

  let quarterProgressPct: number | null = null;
  if (quarterGoal) {
    const [{ count: total }, { count: done }] = await Promise.all([
      supabase
        .from("goals")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", quarterGoal.id),
      supabase
        .from("goals")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", quarterGoal.id)
        .eq("status", "done"),
    ]);
    quarterProgressPct = computeProgressPct(done ?? 0, total ?? 0);
  }

  const chain = await getGoalChain(supabase, dailyEntry?.priority_goal_id ?? null);
  const weekScore = await weekScorePromise;
  const followUpCount = await followUpCountPromise;
  const ideasToReview = await ideasToReviewPromise;

  const habitDone: Record<string, boolean> = {};
  for (const log of todayLogs ?? []) habitDone[log.habit_id] = log.done;

  const doneDatesByHabit = new Map<string, Set<string>>();
  for (const log of doneLogHistory ?? []) {
    if (!doneDatesByHabit.has(log.habit_id)) doneDatesByHabit.set(log.habit_id, new Set());
    doneDatesByHabit.get(log.habit_id)!.add(log.date);
  }

  const streaks: Record<string, number> = {};
  for (const habit of habits ?? []) {
    streaks[habit.id] = computeHabitStreak(
      doneDatesByHabit.get(habit.id) ?? new Set(),
      habit.days_of_week,
      today
    );
  }

  return (
    <>
      <PageTitle>Today</PageTitle>

      <div className="flex flex-col gap-4">
        <HeaderStrip
          northStar={profile?.north_star ?? null}
          quarterGoalTitle={quarterGoal?.title ?? null}
          quarterProgressPct={quarterProgressPct}
          weekScore={weekScore.score}
          weekStreak={weekScore.streak}
        />

        <PriorityCard
          initialText={dailyEntry?.priority_text ?? ""}
          initialGoalId={dailyEntry?.priority_goal_id ?? null}
          pickableGoals={pickableGoals ?? []}
          chain={chain}
        />

        <ScheduleSection blocks={scheduleBlocks ?? []} timeZone={timezone} />

        <FollowUpsLine count={followUpCount} />
        <IdeaReviewCard ideas={ideasToReview} />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">Habits</h2>
          <HabitList habits={habits ?? []} initialDone={habitDone} streaks={streaks} />
          <AddHabitButton />
        </section>

        <DailyReviewSheet alreadySubmitted={Boolean(dailyEntry?.submitted_at)} />
      </div>
    </>
  );
}
