"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import CheckCircle from "@/components/systems/CheckCircle";
import { setSystemDone } from "@/app/(app)/systems/actions";
import { formatDays, TIMES_OF_DAY, TIME_LABELS, type TimeOfDay } from "@/lib/systems";

type Item = {
  id: string;
  slug: string;
  name: string;
  daysOfWeek: number[];
  timeOfDay: TimeOfDay | null;
  stepCount: number;
  scheduled: boolean;
  done: boolean;
  /** steps ticked on the selected day */
  ticked: number;
  streak: number;
};

/**
 * The selected day's systems (today by default) grouped by time of day, then
 * the ones not scheduled that day. Checking one logs it for that day.
 */
export default function SystemList({ systems, day, dayLabel }: { systems: Item[]; day: string; dayLabel: string }) {
  const [items, setOptimistic] = useOptimistic(
    systems,
    (state, update: { id: string; done: boolean }) =>
      state.map((s) =>
        s.id === update.id ? { ...s, done: update.done, ticked: update.done ? s.stepCount : 0 } : s
      )
  );
  const [, startTransition] = useTransition();

  function toggle(item: Item) {
    const done = !item.done;
    startTransition(async () => {
      setOptimistic({ id: item.id, done });
      await setSystemDone(item.id, done, day);
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        No systems yet. A system is a habit stack, like your morning routine. Create your first one below.
      </p>
    );
  }

  const todays = items.filter((s) => s.scheduled);
  const groups = [...TIMES_OF_DAY, null]
    .map((time) => ({
      label: TIME_LABELS[time ?? "anytime"],
      items: todays.filter((s) => s.timeOfDay === time),
    }))
    .filter((g) => g.items.length > 0);
  const notToday = items.filter((s) => !s.scheduled);

  return (
    <div className="flex flex-col gap-5">
      {todays.length === 0 && <p className="text-sm text-muted">Nothing scheduled {dayLabel}.</p>}
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</h2>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <Row key={item.id} item={item} onToggle={() => toggle(item)} />
            ))}
          </ul>
        </section>
      ))}
      {notToday.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Not scheduled {dayLabel === "today" ? "today" : "that day"}</h2>
          <ul className="flex flex-col gap-2 opacity-70">
            {notToday.map((item) => (
              <Row key={item.id} item={item} onToggle={() => toggle(item)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    <li
      className={`flex items-center rounded-xl border transition-colors ${
        item.done ? "border-good/30 bg-good/5" : "border-border bg-bg"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.done ? `Uncheck ${item.name}` : `Check off ${item.name}`}
        className="py-4 pl-4 pr-3"
      >
        <CheckCircle
          checked={item.done}
          size="md"
          progress={item.stepCount ? item.ticked / item.stepCount : 0}
        />
      </button>
      <Link href={`/systems/${item.slug}`} className="flex min-w-0 flex-1 items-center gap-2 py-4 pr-3">
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${item.done ? "text-muted line-through" : ""}`}>
            {item.name}
          </span>
          <span className="block text-xs text-muted">
            {item.ticked > 0 && !item.done
              ? `${item.ticked} of ${item.stepCount} steps`
              : `${item.stepCount} ${item.stepCount === 1 ? "step" : "steps"}`}
            {!item.scheduled && ` · ${formatDays(item.daysOfWeek)}`}
            {item.streak > 0 && <span className="text-accent"> · {item.streak} day streak</span>}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}
