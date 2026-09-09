export default function HeaderStrip({
  northStar,
  monthGoalTitle,
  monthProgressPct,
  weekScore,
  weekStreak,
}: {
  northStar: string | null;
  monthGoalTitle: string | null;
  monthProgressPct: number | null;
  weekScore: number;
  weekStreak: number;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-3">
      <p className="text-xs uppercase tracking-wide text-accent">
        {northStar ?? "Set your north star"}
      </p>

      {monthGoalTitle && (
        <div>
          <p className="text-sm">{monthGoalTitle}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${monthProgressPct ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-muted">
        <span>Week score: {weekScore}%</span>
        <span>Streak: {weekStreak}w</span>
      </div>
    </div>
  );
}
