import "server-only";
import { format, getISODay, parseISO, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { computeHabitStreak } from "@/lib/streaks";
import { buildHistory, completionRate, isTimeOfDay, type TimeOfDay } from "@/lib/systems";

const LOOKBACK_DAYS = 370;

export type SystemSummary = {
  id: string;
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

/** All of the user's systems (or one, by id) with today's state and streak. */
export async function loadSystems(onlyId?: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = getLocalDateString(new Date(), timeZone);
  const cutoff = format(subDays(parseISO(today), LOOKBACK_DAYS), "yyyy-MM-dd");

  let systemsQuery = supabase
    .from("systems")
    .select("id, name, days_of_week, time_of_day, created_at, system_steps(count)")
    .order("sort");
  let logsQuery = supabase.from("system_logs").select("system_id, date").gte("date", cutoff);
  if (onlyId) {
    systemsQuery = systemsQuery.eq("id", onlyId);
    logsQuery = logsQuery.eq("system_id", onlyId);
  }
  const [{ data: systems }, { data: logs }] = await Promise.all([systemsQuery, logsQuery]);

  const datesBySystem = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!datesBySystem.has(log.system_id)) datesBySystem.set(log.system_id, new Set());
    datesBySystem.get(log.system_id)!.add(log.date);
  }

  const todayWeekday = getISODay(parseISO(today));
  const summaries: SystemSummary[] = (systems ?? []).map((s) => {
    const doneDates = datesBySystem.get(s.id) ?? new Set<string>();
    return {
      id: s.id,
      name: s.name,
      daysOfWeek: s.days_of_week,
      timeOfDay: isTimeOfDay(s.time_of_day) ? s.time_of_day : null,
      stepCount: s.system_steps[0]?.count ?? 0,
      scheduledToday: s.days_of_week.includes(todayWeekday),
      doneToday: doneDates.has(today),
      streak: computeHabitStreak(doneDates, s.days_of_week, today),
      startDate: getLocalDateString(new Date(s.created_at), timeZone),
      doneDates,
    };
  });

  return { today, systems: summaries };
}

export function historyFor(system: SystemSummary, today: string) {
  return {
    grid: buildHistory(system.doneDates, system.daysOfWeek, today, system.startDate),
    rate: completionRate(system.doneDates, system.daysOfWeek, today, system.startDate),
  };
}
