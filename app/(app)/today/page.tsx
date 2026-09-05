import PageTitle from "@/components/PageTitle";
import HeaderStrip from "@/components/today/HeaderStrip";
import PriorityCard from "@/components/today/PriorityCard";
import HabitList from "@/components/today/HabitList";
import MetricList from "@/components/today/MetricList";
import DailyReviewSheet from "@/components/today/DailyReviewSheet";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, getLocalWeekday, DEFAULT_TIMEZONE } from "@/lib/dates";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type ChainLink = { id: string; title: string; level: string };

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

  const [
    { data: quarterGoal },
    { data: pickableGoals },
    { data: dailyEntry },
    { data: habits },
    { data: habitLogs },
    { data: counterMetrics },
    { data: counterLogs },
    { data: hoursMetrics },
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
      .select("id, name")
      .eq("active", true)
      .contains("days_of_week", [weekday])
      .order("sort"),
    supabase.from("habit_logs").select("habit_id, done").eq("date", today),
    supabase
      .from("metrics")
      .select("id, name, unit, weekly_target")
      .eq("active", true)
      .eq("entry_mode", "counter")
      .order("sort"),
    supabase.from("metric_logs").select("metric_id, value").eq("date", today),
    supabase
      .from("metrics")
      .select("id, name")
      .eq("active", true)
      .eq("entry_mode", "daily_review")
      .order("sort"),
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
  for (const log of habitLogs ?? []) habitDone[log.habit_id] = log.done;

  const metricValues: Record<string, number> = {};
  for (const log of counterLogs ?? []) metricValues[log.metric_id] = log.value;

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

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Habits</h2>
          <HabitList habits={habits ?? []} initialDone={habitDone} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Metrics</h2>
          <MetricList metrics={counterMetrics ?? []} initialValues={metricValues} />
        </section>

        <DailyReviewSheet
          hoursMetrics={hoursMetrics ?? []}
          alreadySubmitted={Boolean(dailyEntry?.submitted_at)}
        />
      </div>
    </>
  );
}
