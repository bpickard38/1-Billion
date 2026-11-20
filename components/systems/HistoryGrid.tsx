import type { HistoryCell, HistoryState } from "@/lib/systems";

const CELL: Record<HistoryState, string> = {
  done: "bg-good",
  missed: "bg-border",
  off: "bg-surface",
  future: "bg-transparent",
  before: "bg-transparent",
};

const LABEL: Record<HistoryState, string> = {
  done: "done",
  missed: "missed",
  off: "not scheduled",
  future: "",
  before: "",
};

/** 16 weeks of Monday..Sunday columns, oldest on the left. */
export default function HistoryGrid({ grid, today }: { grid: HistoryCell[][]; today: string }) {
  return (
    <div>
      <div className="flex gap-[3px]">
        {grid.map((week) => (
          <div key={week[0].date} className="flex flex-1 flex-col gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={LABEL[cell.state] ? `${cell.date}: ${LABEL[cell.state]}` : cell.date}
                className={`aspect-square w-full rounded-[3px] ${CELL[cell.state]} ${
                  cell.date === today ? "ring-1 ring-accent ring-offset-1 ring-offset-bg" : ""
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-good" />Done</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-border" />Missed</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-surface ring-1 ring-border" />Off day</span>
      </div>
    </div>
  );
}
