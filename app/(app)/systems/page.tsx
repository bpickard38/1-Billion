import Link from "next/link";
import { format, parseISO, subDays } from "date-fns";
import { Plus } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import SystemList from "@/components/systems/SystemList";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { computeHabitStreak } from "@/lib/streaks";
import { logout } from "@/app/login/actions";

const STREAK_LOOKBACK_DAYS = 370;
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

export default async function SystemsPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const today = getLocalDateString(new Date(), profile?.timezone ?? DEFAULT_TIMEZONE);
  const cutoff = format(subDays(parseISO(today), STREAK_LOOKBACK_DAYS), "yyyy-MM-dd");

  const [{ data: systems }, { data: logs }] = await Promise.all([
    supabase.from("systems").select("id, name, system_steps(count)").order("sort"),
    supabase.from("system_logs").select("system_id, date").gte("date", cutoff),
  ]);

  const datesBySystem = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!datesBySystem.has(log.system_id)) datesBySystem.set(log.system_id, new Set());
    datesBySystem.get(log.system_id)!.add(log.date);
  }

  const items = (systems ?? []).map((s) => {
    const dates = datesBySystem.get(s.id) ?? new Set<string>();
    return {
      id: s.id,
      name: s.name,
      stepCount: s.system_steps[0]?.count ?? 0,
      doneToday: dates.has(today),
      streak: computeHabitStreak(dates, EVERY_DAY, today),
    };
  });
  const doneCount = items.filter((i) => i.doneToday).length;

  return (
    <>
      <div className="flex items-end justify-between">
        <PageTitle>Systems</PageTitle>
        {items.length > 0 && (
          <p className="pb-5 text-sm text-muted">
            {doneCount}/{items.length} today
          </p>
        )}
      </div>

      <SystemList systems={items} />

      <Link
        href="/systems/new"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-white active:opacity-80"
      >
        <Plus size={18} strokeWidth={2.5} />
        New system
      </Link>

      <form action={logout} className="mt-10 text-center">
        <button type="submit" className="text-sm text-muted underline-offset-4 active:underline">
          Sign out
        </button>
      </form>
    </>
  );
}
