import { format, parseISO } from "date-fns";
import PageTitle from "@/components/PageTitle";
import DayCalendar from "@/components/schedule/DayCalendar";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { materializeTodaySchedule } from "@/app/(app)/today/actions";

export default async function SchedulePage() {
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("timezone").maybeSingle();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = getLocalDateString(new Date(), timeZone);

  await materializeTodaySchedule();

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("id, start_at, end_at, title, category")
    .eq("date", today)
    .order("start_at");

  return (
    <>
      <PageTitle>{format(parseISO(today), "EEEE, MMM d")}</PageTitle>
      <DayCalendar blocks={blocks ?? []} timeZone={timeZone} />
    </>
  );
}
