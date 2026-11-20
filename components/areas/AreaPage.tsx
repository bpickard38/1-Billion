import Link from "next/link";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { Check, Plus } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import AreaPlanner from "@/components/areas/AreaPlanner";
import { createClient } from "@/lib/supabase/server";
import { loadSystems } from "@/lib/systems-data";
import { AREA_INFO, type Area } from "@/lib/areas";
import { TIME_LABELS } from "@/lib/systems";

/** The Content / Code tab: goals + AI planner, then this week's tasks day by day. */
export default async function AreaPage({ area }: { area: Area }) {
  const supabase = await createClient();
  const [{ today, systems }, { data: plan }] = await Promise.all([
    loadSystems(),
    supabase.from("area_plans").select("goals, summary").eq("area", area).maybeSingle(),
  ]);
  const tasks = systems.filter((s) => s.area === area);
  const monday = startOfWeek(parseISO(today), { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(monday, i), "yyyy-MM-dd");
    return { day: i + 1, date, tasks: tasks.filter((t) => t.daysOfWeek.includes(i + 1)) };
  });
  const info = AREA_INFO[area];

  if (tasks.length === 0) {
    return (
      <>
        <PageTitle>{info.label}</PageTitle>
        <p className="pb-4 text-sm text-muted">{info.intro}</p>
        <AreaPlanner area={area} initialGoals={plan?.goals ?? ""} hasTasks={false} />
      </>
    );
  }

  return (
    <>
      <PageTitle>{info.label}</PageTitle>
      <h2 className="pb-2 text-sm font-semibold text-muted">This week</h2>
      <ul className="flex flex-col gap-2">
        {week.map(({ day, date, tasks: dayTasks }) => {
          const isToday = date === today;
          return (
            <li
              key={day}
              className={`rounded-xl border px-4 py-3 ${isToday ? "border-accent/40 bg-accent/5" : "border-border"}`}
            >
              <p
                className={`pb-1 text-xs font-semibold uppercase tracking-wide ${isToday ? "text-accent" : "text-muted"}`}
              >
                {isToday ? "Today · " : ""}
                {format(parseISO(date), "EEE d")}
              </p>
              {dayTasks.length === 0 ? (
                <p className="text-sm text-muted">Nothing planned</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {dayTasks.map((t) => {
                    const done = t.doneDates.has(date);
                    const meta = [t.minutes ? `${t.minutes} min` : null, t.timeOfDay ? TIME_LABELS[t.timeOfDay] : null]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={t.id}>
                        <Link href={`/systems/${t.slug}`} className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              done ? "border-good bg-good text-white" : "border-border"
                            }`}
                          >
                            {done && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className="min-w-0">
                            <span className={`block ${done ? "text-muted line-through" : ""}`}>{t.name}</span>
                            {meta && <span className="block text-xs text-muted">{meta}</span>}
                            {isToday && t.details && <span className="mt-0.5 block text-sm">{t.details}</span>}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="pt-2 text-xs text-muted">Check these off on the Systems tab.</p>

      {plan?.summary && <p className="mt-6 rounded-xl bg-surface p-4 text-sm">{plan.summary}</p>}

      <Link
        href={`/systems/new?area=${area}`}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-accent py-3 text-sm font-semibold text-accent"
      >
        <Plus size={16} />
        Add a task
      </Link>

      <details className="mt-6 pb-6">
        <summary className="cursor-pointer list-none text-sm font-semibold text-accent">Change goals & replan</summary>
        <div className="pt-4">
          <AreaPlanner area={area} initialGoals={plan?.goals ?? ""} hasTasks />
        </div>
      </details>
    </>
  );
}
