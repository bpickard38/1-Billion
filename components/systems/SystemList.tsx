"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import CheckCircle from "@/components/systems/CheckCircle";
import { setSystemDone } from "@/app/(app)/systems/actions";

type Item = { id: string; name: string; stepCount: number; doneToday: boolean; streak: number };

export default function SystemList({ systems }: { systems: Item[] }) {
  const [items, setOptimistic] = useOptimistic(
    systems,
    (state, update: { id: string; done: boolean }) =>
      state.map((s) => (s.id === update.id ? { ...s, doneToday: update.done } : s))
  );
  const [, startTransition] = useTransition();

  function toggle(item: Item) {
    const done = !item.doneToday;
    startTransition(async () => {
      setOptimistic({ id: item.id, done });
      await setSystemDone(item.id, done);
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        No systems yet. A system is a habit stack, like your morning routine. Create your first one below.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex items-center rounded-xl border transition-colors ${
            item.doneToday ? "border-good/30 bg-good/5" : "border-border bg-bg"
          }`}
        >
          <button
            type="button"
            onClick={() => toggle(item)}
            aria-label={item.doneToday ? `Uncheck ${item.name}` : `Check off ${item.name}`}
            className="py-4 pl-4 pr-3"
          >
            <CheckCircle checked={item.doneToday} size="md" />
          </button>
          <Link href={`/systems/${item.id}`} className="flex flex-1 items-center gap-2 py-4 pr-3 min-w-0">
            <span className="flex-1 min-w-0">
              <span className={`block truncate font-medium ${item.doneToday ? "text-muted line-through" : ""}`}>
                {item.name}
              </span>
              <span className="block text-xs text-muted">
                {item.stepCount} {item.stepCount === 1 ? "step" : "steps"}
                {item.streak > 0 && <span className="text-accent"> · {item.streak} day streak</span>}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
