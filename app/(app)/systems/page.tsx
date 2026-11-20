import Link from "next/link";
import { ArrowUpDown, Plus } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import SystemList from "@/components/systems/SystemList";
import HomeCalendar from "@/components/systems/HomeCalendar";
import { loadSystems } from "@/lib/systems-data";
import { buildOverviewMonth, monthNav, parseDay, parseMonth } from "@/lib/systems";
import { format, getISODay, parseISO } from "date-fns";
import { logout } from "@/app/login/actions";

export default async function SystemsPage({ searchParams }: PageProps<"/systems">) {
  const { day: dayParam, month: monthParam } = await searchParams;
  const { today, systems } = await loadSystems();
  const day = parseDay(dayParam, today);
  const month = parseMonth(monthParam ?? day.slice(0, 7), today);
  const weekday = getISODay(parseISO(day));
  const isToday = day === today;

  const items = systems.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    daysOfWeek: s.daysOfWeek,
    timeOfDay: s.timeOfDay,
    stepCount: s.stepCount,
    scheduled: s.daysOfWeek.includes(weekday),
    done: s.doneDates.has(day),
    streak: s.streak,
  }));
  const scheduled = items.filter((s) => s.scheduled);
  const doneCount = scheduled.filter((s) => s.done).length;
  const dayLabel = isToday ? "today" : format(parseISO(day), "EEE, MMM d");

  return (
    <>
      <div className="flex items-center justify-between">
        <PageTitle>Systems</PageTitle>
        {items.length > 0 && (
          <div className="flex items-center gap-1">
            <Link href="/systems/reorder" aria-label="Reorder" className="rounded-lg p-2 text-muted active:bg-surface">
              <ArrowUpDown size={20} />
            </Link>
          </div>
        )}
      </div>
      {items.length > 0 && (
        <HomeCalendar
          weeks={buildOverviewMonth(month, systems, today)}
          month={month}
          today={today}
          selected={day}
          {...monthNav(month, today, "/systems")}
        />
      )}

      {items.length > 0 && (
        <div className="flex items-baseline justify-between pb-3">
          <h2 className="font-semibold">{isToday ? "Today" : format(parseISO(day), "EEEE, MMM d")}</h2>
          {isToday ? (
            scheduled.length > 0 && (
              <span className="text-sm text-muted">
                {doneCount === scheduled.length ? "All done" : `${doneCount} of ${scheduled.length} done`}
              </span>
            )
          ) : (
            <Link href="/systems" scroll={false} className="text-sm text-accent">
              Back to today
            </Link>
          )}
        </div>
      )}

      <SystemList key={day} systems={items} day={day} dayLabel={dayLabel} />

      <Link
        href="/systems/new"
        className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-white active:opacity-80"
      >
        <Plus size={18} strokeWidth={2.5} />
        New system
      </Link>

      <form action={logout} className="mt-10 pb-6 text-center">
        <button type="submit" className="text-sm text-muted underline-offset-4 active:underline">
          Sign out
        </button>
      </form>
    </>
  );
}
