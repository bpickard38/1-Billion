import Link from "next/link";
import { ArrowUpDown, CalendarDays, Plus } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import SystemList from "@/components/systems/SystemList";
import { loadSystems } from "@/lib/systems-data";
import { logout } from "@/app/login/actions";

export default async function SystemsPage() {
  const { systems } = await loadSystems();
  const items = systems.map((s) => ({
    id: s.id,
    name: s.name,
    daysOfWeek: s.daysOfWeek,
    timeOfDay: s.timeOfDay,
    stepCount: s.stepCount,
    scheduledToday: s.scheduledToday,
    doneToday: s.doneToday,
    streak: s.streak,
  }));
  const todays = items.filter((s) => s.scheduledToday);
  const doneCount = todays.filter((s) => s.doneToday).length;

  return (
    <>
      <div className="flex items-center justify-between">
        <PageTitle>Systems</PageTitle>
        {items.length > 0 && (
          <div className="flex items-center gap-1">
            <Link href="/systems/history" aria-label="History" className="rounded-lg p-2 text-muted active:bg-surface">
              <CalendarDays size={20} />
            </Link>
            <Link href="/systems/reorder" aria-label="Reorder" className="rounded-lg p-2 text-muted active:bg-surface">
              <ArrowUpDown size={20} />
            </Link>
          </div>
        )}
      </div>
      {todays.length > 0 && (
        <p className="-mt-2 pb-4 text-sm text-muted">
          {doneCount === todays.length ? "All done today" : `${doneCount} of ${todays.length} done today`}
        </p>
      )}

      <SystemList systems={items} />

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
