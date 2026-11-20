import { getISODay, parseISO } from "date-fns";
import PageTitle from "@/components/PageTitle";
import PlanForm from "@/components/exercise/PlanForm";
import ChangeForm from "@/components/exercise/ChangeForm";
import WorkoutDay from "@/components/exercise/WorkoutDay";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { workoutPlanSchema } from "@/lib/workout-ai";

// Building a plan can take close to a minute.
export const maxDuration = 120;

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Starting point from what Brayden described; editable before the first plan.
const DEFAULT_GOALS = "Calisthenics: handstand push-up, planche.\nFlexibility: front splits and middle splits.";
const DEFAULT_SCHEDULE =
  "Mon, Wed, Fri: big calisthenics days.\nTue, Sat: running.\nStretching every day.\nThu, Sun: lighter / recovery.";

export default async function ExercisePage() {
  const supabase = await createClient();
  const [{ data: row }, profile] = await Promise.all([
    supabase.from("workout_plans").select("goals, schedule, notes, plan").maybeSingle(),
    getProfile(),
  ]);
  const today = getLocalDateString(new Date(), profile?.timezone ?? DEFAULT_TIMEZONE);
  const weekday = getISODay(parseISO(today));
  const parsed = workoutPlanSchema.safeParse(row?.plan);
  const plan = parsed.success ? parsed.data : null;

  const form = (
    <PlanForm
      initialGoals={row?.goals || DEFAULT_GOALS}
      initialSchedule={row?.schedule || DEFAULT_SCHEDULE}
      initialNotes={row?.notes ?? ""}
      hasPlan={Boolean(plan)}
    />
  );

  if (!plan) {
    return (
      <>
        <PageTitle>Exercise</PageTitle>
        <p className="pb-5 text-sm text-muted">
          Tell the AI your goals and which days you train. It builds a weekly plan with progressions toward each goal.
        </p>
        {form}
      </>
    );
  }

  const todayPlan = plan.days.find((d) => d.day === weekday);

  return (
    <>
      <PageTitle>Exercise</PageTitle>

      {todayPlan && (
        <section className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Today · {DAY_NAMES[weekday - 1]}</p>
          <div className="flex items-baseline justify-between gap-2 pb-3">
            <h2 className="text-lg font-bold">{todayPlan.title}</h2>
            <span className="shrink-0 text-sm text-muted">{todayPlan.minutes} min</span>
          </div>
          <WorkoutDay day={todayPlan} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="pb-2 text-sm font-semibold text-muted">This week</h2>
        <ul className="flex flex-col gap-2">
          {plan.days.map((d) => (
            <li key={d.day}>
              <details className="group rounded-xl border border-border">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <span className={`w-9 shrink-0 text-sm font-semibold ${d.day === weekday ? "text-accent" : "text-muted"}`}>
                    {DAY_NAMES[d.day - 1].slice(0, 3)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
                  <span className="shrink-0 text-xs text-muted">{d.minutes} min</span>
                </summary>
                <div className="border-t border-border px-4 py-3">
                  <WorkoutDay day={d} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {(plan.summary || plan.tips.length > 0) && (
        <section className="mt-6 rounded-xl bg-surface p-4 text-sm">
          {plan.summary && <p>{plan.summary}</p>}
          {plan.tips.length > 0 && (
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
              {plan.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-6">
        <h2 className="pb-2 text-sm font-semibold text-muted">Change something</h2>
        <ChangeForm />
      </section>

      <details className="mt-6 pb-6">
        <summary className="cursor-pointer list-none text-sm font-semibold text-accent">Edit goals & schedule</summary>
        <div className="pt-4">{form}</div>
      </details>
    </>
  );
}
