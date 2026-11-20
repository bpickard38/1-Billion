import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import MonthCalendar from "@/components/systems/MonthCalendar";
import { historyFor, loadSystems } from "@/lib/systems-data";
import { formatDays, monthNav, parseMonth } from "@/lib/systems";

export default async function HistoryPage({ searchParams }: PageProps<"/systems/history">) {
  const { month: monthParam } = await searchParams;
  const { today, systems } = await loadSystems();
  const month = parseMonth(monthParam, today);
  const nav = monthNav(month, today, "/systems/history");
  const rows = systems.map((system) => ({ system, ...historyFor(system, today, month) }));

  const totals = rows.reduce(
    (acc, r) => ({ done: acc.done + (r.rate?.done ?? 0), scheduled: acc.scheduled + (r.rate?.scheduled ?? 0) }),
    { done: 0, scheduled: 0 }
  );
  const overall = totals.scheduled ? Math.round((totals.done / totals.scheduled) * 100) : null;
  const best = Math.max(0, ...systems.map((s) => s.streak));

  return (
    <>
      <div className="py-3">
        <Link href="/systems" className="-ml-1 flex items-center gap-0.5 text-sm text-accent">
          <ChevronLeft size={18} />
          Systems
        </Link>
      </div>
      <h1 className="pb-4 text-2xl font-bold tracking-tight">History</h1>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="text-2xl font-bold">{overall === null ? "–" : `${overall}%`}</p>
          <p className="text-xs text-muted">all systems, last 30 days</p>
        </div>
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="text-2xl font-bold">{best}</p>
          <p className="text-xs text-muted">longest current streak</p>
        </div>
      </div>

      <ul className="mt-6 flex flex-col gap-8 pb-8">
        {rows.map(({ system, weeks, rate }) => (
          <li key={system.id} className="flex flex-col gap-2">
            <Link href={`/systems/${system.slug}`} className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">{system.name}</span>
              <span className="shrink-0 text-xs text-muted">
                {rate ? `${rate.pct}%` : "–"} · {system.streak} day streak
              </span>
            </Link>
            <p className="-mt-2 text-xs text-muted">{formatDays(system.daysOfWeek)}</p>
            <MonthCalendar key={month} systemId={system.id} weeks={weeks} today={today} {...nav} />
          </li>
        ))}
      </ul>
    </>
  );
}
