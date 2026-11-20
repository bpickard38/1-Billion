import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import SystemRunner from "@/components/systems/SystemRunner";
import MonthCalendar from "@/components/systems/MonthCalendar";
import { createClient } from "@/lib/supabase/server";
import { historyFor, loadSystems } from "@/lib/systems-data";
import { formatDays, monthNav, parseMonth, TIME_LABELS } from "@/lib/systems";

export default async function SystemPage({ params, searchParams }: PageProps<"/systems/[slug]">) {
  const [{ slug }, { month: monthParam }] = await Promise.all([params, searchParams]);
  const { today, systems } = await loadSystems(slug);
  const system = systems[0];
  if (!system) notFound();

  const supabase = await createClient();
  const [{ data: steps }, { data: stepLogs }] = await Promise.all([
    supabase.from("system_steps").select("id, title").eq("system_id", system.id).order("sort"),
    supabase.from("step_logs").select("step_id").eq("system_id", system.id).eq("date", today),
  ]);
  const month = parseMonth(monthParam, today);
  const { weeks, rate } = historyFor(system, today, month);

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <Link href="/systems" className="-ml-1 flex items-center gap-0.5 text-sm text-accent">
          <ChevronLeft size={18} />
          Systems
        </Link>
        <Link href={`/systems/${slug}/edit`} className="text-sm text-accent">
          Edit
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">{system.name}</h1>
      <p className="pb-4 text-sm text-muted">
        {formatDays(system.daysOfWeek)} · {TIME_LABELS[system.timeOfDay ?? "anytime"]}
        {!system.scheduledToday && " · not scheduled today"}
      </p>

      <SystemRunner
        systemId={system.id}
        steps={steps ?? []}
        initialTicked={(stepLogs ?? []).map((l) => l.step_id)}
        initialDone={system.doneToday}
      />

      <section className="mt-8 flex flex-col gap-3 pb-8">
        <h2 className="text-sm font-semibold text-muted">History</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface px-4 py-3">
            <p className="text-2xl font-bold">{system.streak}</p>
            <p className="text-xs text-muted">day streak</p>
          </div>
          <div className="rounded-xl bg-surface px-4 py-3">
            <p className="text-2xl font-bold">{rate ? `${rate.pct}%` : "–"}</p>
            <p className="text-xs text-muted">
              {rate ? `${rate.done} of ${rate.scheduled} days, last 30` : "last 30 days"}
            </p>
          </div>
        </div>
        <MonthCalendar
          key={month}
          systemId={system.id}
          weeks={weeks}
          today={today}
          {...monthNav(month, today, `/systems/${slug}`)}
        />
      </section>
    </>
  );
}
