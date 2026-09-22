import type { ScoreBreakdownRow } from "@/lib/score";

// Moved here from the removed Week tab (nav rework) — this is now the only
// place the current week's streak + per-day to-do percentages show.
export default function WeekStreakCard({
  score,
  label,
  streak,
  breakdown,
}: {
  score: number;
  label: string;
  streak: number;
  breakdown: ScoreBreakdownRow[];
}) {
  return (
    <section className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">This week</span>
        <span className="text-xs text-muted">Streak: {streak}w</span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{score}%</span>
        <span className="text-sm text-muted">{label}</span>
      </div>

      {breakdown.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {breakdown.map((row) => (
            <li key={row.date} className="flex items-center justify-between text-sm">
              <span>{row.label}</span>
              <span className="text-muted">{row.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
