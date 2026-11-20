import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { OverviewCell, OverviewState } from "@/lib/systems";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const BOX: Record<OverviewState, string> = {
  all: "border-good bg-good text-white font-semibold",
  some: "border-good bg-good/20 text-fg",
  none: "border-border text-fg",
  off: "border-dashed border-border text-muted",
  future: "border-border/50 text-muted/60",
};

/** All systems combined. Tapping a day shows that day's systems below. */
export default function HomeCalendar({
  weeks,
  month,
  today,
  selected,
  title,
  prevHref,
  nextHref,
}: {
  weeks: (OverviewCell | null)[][];
  month: string;
  today: string;
  selected: string;
  title: string;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const dayHref = (date: string) => {
    const params = new URLSearchParams();
    if (date !== today) params.set("day", date);
    if (month !== today.slice(0, 7)) params.set("month", month);
    const query = params.toString();
    return query ? `/systems?${query}` : "/systems";
  };
  const nav = "rounded-lg p-1.5 text-muted active:bg-surface";

  return (
    <section className="mb-6">
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
        {weeks.flat().map((cell, i) => {
          if (!cell) return <span key={`pad-${i}`} />;
          const className = `flex h-10 items-center justify-center rounded-lg border text-sm transition-colors ${
            BOX[cell.state]
          } ${cell.date === selected ? "ring-2 ring-accent ring-offset-1 ring-offset-bg" : ""} ${
            cell.date === today ? "underline decoration-2 underline-offset-4" : ""
          }`;
          const label = Number(cell.date.slice(8));
          return cell.state === "future" ? (
            <span key={cell.date} className={className}>
              {label}
            </span>
          ) : (
            <Link key={cell.date} href={dayHref(cell.date)} scroll={false} aria-current={cell.date === selected ? "date" : undefined} className={className}>
              {label}
            </Link>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-good bg-good" />All done</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-good bg-good/20" />Some</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-border" />None</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-dashed border-border" />Nothing scheduled</span>
      </div>
    </section>
  );
}
