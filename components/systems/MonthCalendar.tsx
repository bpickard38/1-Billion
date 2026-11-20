"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { setSystemDone } from "@/app/(app)/systems/actions";
import type { HistoryCell, HistoryState } from "@/lib/systems";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const BOX: Record<HistoryState, string> = {
  done: "border-good bg-good text-white font-semibold",
  missed: "border-border text-fg",
  off: "border-dashed border-border text-muted",
  before: "border-border/60 text-muted",
  future: "border-border/50 text-muted/60",
};

/**
 * A month of outlined day boxes. Green = done. Tap today or any past day to
 * mark it done or not done.
 */
export default function MonthCalendar({
  systemId,
  title,
  weeks,
  today,
  prevHref,
  nextHref,
}: {
  systemId: string;
  title: string;
  weeks: (HistoryCell | null)[][];
  today: string;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const [cells, toggle] = useOptimistic(weeks, (state, date: string) =>
    state.map((week) =>
      week.map((cell) =>
        cell && cell.date === date
          ? { ...cell, state: (cell.state === "done" ? (date >= today ? "future" : "missed") : "done") as HistoryState }
          : cell
      )
    )
  );
  const [, startTransition] = useTransition();

  function tap(cell: HistoryCell) {
    if (cell.date > today) return;
    const done = cell.state !== "done";
    startTransition(async () => {
      toggle(cell.date);
      await setSystemDone(systemId, done, cell.date);
    });
  }

  const nav = "rounded-lg p-1.5 text-muted active:bg-surface";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        {prevHref ? (
          <Link href={prevHref} scroll={false} aria-label="Previous month" className={nav}>
            <ChevronLeft size={18} />
          </Link>
        ) : (
          <span className="w-[30px]" />
        )}
        <span className="text-sm font-semibold">{title}</span>
        {nextHref ? (
          <Link href={nextHref} scroll={false} aria-label="Next month" className={nav}>
            <ChevronRight size={18} />
          </Link>
        ) : (
          <span className="w-[30px]" />
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-[11px] font-medium text-muted">
            {d}
          </span>
        ))}
        {cells.flat().map((cell, i) =>
          cell ? (
            <button
              key={cell.date}
              type="button"
              onClick={() => tap(cell)}
              disabled={cell.date > today}
              aria-pressed={cell.state === "done"}
              aria-label={`${cell.date}${cell.state === "done" ? ", done" : ""}`}
              className={`flex aspect-square items-center justify-center rounded-lg border text-sm transition-colors ${
                BOX[cell.state]
              } ${cell.date === today ? "ring-2 ring-accent ring-offset-1 ring-offset-bg" : ""}`}
            >
              {Number(cell.date.slice(8))}
            </button>
          ) : (
            <span key={`pad-${i}`} />
          )
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-good bg-good" />Done</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-border" />Not done</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-dashed border-border" />Off day</span>
        <span>Tap a day to change it</span>
      </div>
    </div>
  );
}
