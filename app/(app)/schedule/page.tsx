import { addDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import DayCalendar from "@/components/schedule/DayCalendar";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { materializeTodaySchedule } from "@/app/(app)/today/actions";
import { syncGoogleCalendarForUser } from "@/lib/google";

export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("timezone").maybeSingle();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = getLocalDateString(new Date(), timeZone);

  // ?date=YYYY-MM-DD views another day; anything else falls back to today.
  const { date: dateParam } = await searchParams;
  const date = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
  const isToday = date === today;
  const prev = format(addDays(parseISO(date), -1), "yyyy-MM-dd");
  const next = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
  const dayHref = (d: string) => (d === today ? "/schedule" : `/schedule?date=${d}`);
  const relative =
    isToday ? "Today" : date === format(addDays(parseISO(today), 1), "yyyy-MM-dd") ? "Tomorrow" : date === format(addDays(parseISO(today), -1), "yyyy-MM-dd") ? "Yesterday" : null;

  await materializeTodaySchedule();

  // Pull direction (Phase 10): anchored to the Schedule tab rather than
  // Today, since the day view lives here, not on Today — which stays
  // check-off-only per §3.2's under-2s load budget.
  if (user) {
    const { data: tokenRow } = await supabase.from("google_tokens").select("*").maybeSingle();
    if (tokenRow) {
      await syncGoogleCalendarForUser(supabase, user.id, tokenRow, timeZone);
    }
  }

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("id, start_at, end_at, title, category, google_recurring_event_id, recurrence_days")
    .eq("date", date)
    .order("start_at");

  return (
    <>
      {/* Sticky so the day and arrows stay visible after the calendar auto-scrolls. */}
      <div className="sticky z-30 -mx-4 bg-bg px-4 pb-2" style={{ top: "env(safe-area-inset-top)" }}>
      <div className="flex items-center gap-2">
        <Link href={dayHref(prev)} aria-label="Previous day" className="-ml-2 rounded-lg p-2 text-muted active:opacity-60">
          <ChevronLeft size={22} />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <PageTitle>{format(parseISO(date), "EEEE, MMM d")}</PageTitle>
        </div>
        <Link href={dayHref(next)} aria-label="Next day" className="-mr-2 rounded-lg p-2 text-muted active:opacity-60">
          <ChevronRight size={22} />
        </Link>
      </div>
      <div className="-mt-3 flex items-center justify-center gap-3 text-xs">
        {relative && <span className="text-muted">{relative}</span>}
        {!isToday && (
          <Link href="/schedule" className="text-accent">
            Back to today
          </Link>
        )}
      </div>
      </div>
      <div className="mb-2" />
      {isToday && (
        <div className="mb-4 flex gap-2"><Link href="/schedule/plan" className="flex-1 rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-bg">Plan my day</Link><Link href="/schedule/plan?days=7" className="rounded-lg border border-border px-4 py-3 text-sm">Plan 7 days</Link></div>
      )}
      <DayCalendar key={date} blocks={blocks ?? []} timeZone={timeZone} date={date} isToday={isToday} />
    </>
  );
}
