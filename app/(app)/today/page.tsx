import { parseISO, subDays, format } from "date-fns";
import PageTitle from "@/components/PageTitle";
import HeaderStrip from "@/components/today/HeaderStrip";
import PriorityCard from "@/components/today/PriorityCard";
import HabitList from "@/components/today/HabitList";
import AddHabitButton from "@/components/today/AddHabitButton";
import DailyReviewSheet from "@/components/today/DailyReviewSheet";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, getLocalWeekday, DEFAULT_TIMEZONE } from "@/lib/dates";
import { computeHabitStreak } from "@/lib/streaks";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type ChainLink = { id: string; title: string; level: string };

const STREAK_LOOKBACK_DAYS = 370;

// Goal levels are shallow (Dream..Today, 8 max) so a naive parent_id walk is
// plenty fast here. Phase 4 promotes this to a shared GoalChain component,
// possibly backed by a recursive CTE.
async function getGoalChain(supabase: Supabase, goalId: string | null): Promise<ChainLink[]> {
  const chain: ChainLink[] = [];
  let currentId = goalId;
  let hops = 0;
  while (currentId && hops < 10) {
    const { data } = await supabase
      .from("goals")
      .select("id, title, level, parent_id")
      .eq("id", currentId)
      .maybeSingle();
    if (!data) break;
    chain.push({ id: data.id, title: data.title, level: data.level });
    currentId = data.parent_id;
    hops++;
  }
  return chain;
}

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

  const [
    { data: quarterGoal },
    { data: pickableGoals },
    { data: dailyEntry },
    { data: habits },
    { data: todayLogs },
    { data: doneLogHistory },
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
    quarterProgressPct = total ? Math.round(((done ?? 0) / total) * 100) : 0;
  }

  const chain = await getGoalChain(supabase, dailyEntry?.priority_goal_id ?? null);

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
        />

        <PriorityCard
          initialText={dailyEntry?.priority_text ?? ""}
          initialGoalId={dailyEntry?.priority_goal_id ?? null}
          pickableGoals={pickableGoals ?? []}
          chain={chain}
        />

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
