import "server-only";
import { format, getISODay, parseISO, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { computeHabitStreak } from "@/lib/streaks";
import { buildMonth, completionRate, isTimeOfDay, type TimeOfDay } from "@/lib/systems";

const LOOKBACK_DAYS = 370;

export type SystemSummary = {
  id: string;
  slug: string;
  name: string;
  daysOfWeek: number[];
  timeOfDay: TimeOfDay | null;
  stepCount: number;
  scheduledToday: boolean;
  doneToday: boolean;
  streak: number;
  startDate: string;
  doneDates: Set<string>;
};

/** All of the user's systems (or one, by slug) with today's state and streak. */
export async function loadSystems(onlySlug?: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = getLocalDateString(new Date(), timeZone);
  const cutoff = format(subDays(parseISO(today), LOOKBACK_DAYS), "yyyy-MM-dd");

  let systemsQuery = supabase
    .from("systems")
    .select("id, slug, name, days_of_week, time_of_day, created_at, system_steps(count)")
    .order("sort");
  if (onlySlug) systemsQuery = systemsQuery.eq("slug", onlySlug);
  const { data: systems } = await systemsQuery;
  const ids = (systems ?? []).map((s) => s.id);
  const { data: logs } = ids.length
    ? await supabase.from("system_logs").select("system_id, date").gte("date", cutoff).in("system_id", ids)
    : { data: [] };

  const datesBySystem = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!datesBySystem.has(log.system_id)) datesBySystem.set(log.system_id, new Set());
    datesBySystem.get(log.system_id)!.add(log.date);
  }

  const todayWeekday = getISODay(parseISO(today));
  const summaries: SystemSummary[] = (systems ?? []).map((s) => {
    const doneDates = datesBySystem.get(s.id) ?? new Set<string>();
    // Backfilled days before the system was created still count.
    const created = getLocalDateString(new Date(s.created_at), timeZone);
    const earliestDone = [...doneDates].sort()[0];
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      daysOfWeek: s.days_of_week,
      timeOfDay: isTimeOfDay(s.time_of_day) ? s.time_of_day : null,
      stepCount: s.system_steps[0]?.count ?? 0,
      scheduledToday: s.days_of_week.includes(todayWeekday),
      doneToday: doneDates.has(today),
      streak: computeHabitStreak(doneDates, s.days_of_week, today),
      startDate: earliestDone && earliestDone < created ? earliestDone : created,
      doneDates,
    };
  });

  return { today, systems: summaries };
}

export function historyFor(system: SystemSummary, today: string, month: string) {
  return {
    weeks: buildMonth(month, system.doneDates, system.daysOfWeek, today, system.startDate),
    rate: completionRate(system.doneDates, system.daysOfWeek, today, system.startDate),
  };
}
