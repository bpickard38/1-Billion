import { format, parseISO } from "date-fns";
import PageTitle from "@/components/PageTitle";
import DayCalendar from "@/components/schedule/DayCalendar";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { materializeTodaySchedule } from "@/app/(app)/today/actions";
import { syncGoogleCalendarForUser } from "@/lib/google";

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("timezone").maybeSingle();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = getLocalDateString(new Date(), timeZone);

  await materializeTodaySchedule();

  // Pull direction (Phase 10): anchored to the Schedule tab rather than
  // Today, since the day view (and its read-only primary-calendar overlay)
  // lives here, not on Today — which stays check-off-only per §3.2's
  // under-2s load budget.
  if (user) {
    const { data: tokenRow } = await supabase.from("google_tokens").select("*").maybeSingle();
    if (tokenRow) {
      await syncGoogleCalendarForUser(supabase, user.id, tokenRow, timeZone);
    }
  }

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("id, start_at, end_at, title, category, source, google_recurring_event_id, recurrence_days")
    .eq("date", today)
    .order("start_at");

  return (
    <>
      <PageTitle>{format(parseISO(today), "EEEE, MMM d")}</PageTitle>
      <DayCalendar blocks={blocks ?? []} timeZone={timeZone} />
    </>
  );
}
