export default function HeaderStrip({
  northStar,
  quarterGoalTitle,
  quarterProgressPct,
}: {
  northStar: string | null;
  quarterGoalTitle: string | null;
  quarterProgressPct: number | null;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-3">
      <p className="text-xs uppercase tracking-wide text-accent">
        {northStar ?? "Set your north star"}
      </p>

      {quarterGoalTitle && (
        <div>
          <p className="text-sm">{quarterGoalTitle}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${quarterProgressPct ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-muted">
        <span>Week score: —</span>
        <span>Streak: —</span>
      </div>
    </div>
  );
}
