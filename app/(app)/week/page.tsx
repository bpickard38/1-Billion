import Link from "next/link";
import { addDays, parseISO, format } from "date-fns";
import PageTitle from "@/components/PageTitle";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeekScore } from "./actions";

export default async function WeekPage() {
  const supabase = await createClient();
  const current = await getCurrentWeekScore();

  const [{ data: weekGoals }, { data: priorWeeks }] = await Promise.all([
    supabase
      .from("goals")
      .select("id, title, status, target_value, target_unit")
      .eq("level", "week")
      .order("starts_on", { ascending: false }),
    supabase
      .from("weekly_reviews")
      .select("week_start, score, biggest_issue, closed_at, auto_closed")
      .lt("week_start", current.weekStart)
      .not("closed_at", "is", null)
      .order("week_start", { ascending: false })
      .limit(12),
  ]);

  return (
    <>
      <PageTitle>Week</PageTitle>

      <section className="mb-6 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted">
            {format(parseISO(current.weekStart), "MMM d")}–
            {format(addDays(parseISO(current.weekStart), 6), "MMM d")}
          </span>
          <span className="text-xs text-muted">Streak: {current.streak}w</span>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold">{current.score}%</span>
          <span className="text-sm text-muted">{current.label}</span>
        </div>

        {current.breakdown.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {current.breakdown.map((row) => (
              <li key={row.habitId} className="flex items-center justify-between text-sm">
                <span>{row.name}</span>
                <span className="text-muted">{row.pct}%</span>
              </li>
            ))}
          </ul>
        )}

        {current.biggestIssue && (
          <p className="mt-2 text-xs text-bad">Biggest issue: {current.biggestIssue}</p>
        )}

        {current.closed ? (
          <p className="mt-3 text-xs text-good">This week is closed.</p>
        ) : (
          <Link
            href="/week/review"
            className="mt-3 block rounded-lg border border-accent/60 px-3 py-2 text-center text-sm font-medium text-accent"
          >
            Weekly review
          </Link>
        )}
      </section>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Week goals</p>
      {(!weekGoals || weekGoals.length === 0) && (
        <p className="text-sm text-muted">No week goals yet — add one from Goals.</p>
      )}
      <ul className="mb-6 flex flex-col gap-2">
        {weekGoals?.map((g) => (
          <li
            key={g.id}
            className={`rounded-lg border border-border px-3 py-2 text-sm ${
              g.status === "dropped" ? "text-muted line-through" : g.status === "done" ? "text-good" : ""
            }`}
          >
            {g.title}
            {g.target_value != null && (
              <span className="ml-2 text-xs text-muted">
                target: {g.target_value} {g.target_unit ?? ""}
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Prior weeks</p>
      {(!priorWeeks || priorWeeks.length === 0) && (
        <p className="text-sm text-muted">No closed weeks yet.</p>
      )}
      <ul className="flex flex-col gap-2">
        {priorWeeks?.map((w) => (
          <li key={w.week_start} className="rounded-lg border border-border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span>
                {format(parseISO(w.week_start), "MMM d")}–{format(addDays(parseISO(w.week_start), 6), "MMM d")}
              </span>
              <span>
                {w.score}% {w.auto_closed && <span className="text-muted">(auto-closed)</span>}
              </span>
            </div>
            {w.biggest_issue && <p className="mt-1 text-xs text-muted">{w.biggest_issue}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
