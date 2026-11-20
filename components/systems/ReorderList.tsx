"use client";

import { useOptimistic, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { setSystemOrder } from "@/app/(app)/systems/actions";
import { TIMES_OF_DAY, TIME_LABELS, type TimeOfDay } from "@/lib/systems";

type Item = { id: string; name: string; timeOfDay: TimeOfDay | null };

export default function ReorderList({ systems }: { systems: Item[] }) {
  const [items, setItems] = useOptimistic(systems);
  const [, startTransition] = useTransition();

  const groups = [...TIMES_OF_DAY, null]
    .map((time) => ({ label: TIME_LABELS[time ?? "anytime"], items: items.filter((s) => s.timeOfDay === time) }))
    .filter((g) => g.items.length > 0);

  function move(groupIndex: number, index: number, by: -1 | 1) {
    const reordered = groups.map((g) => [...g.items]);
    const group = reordered[groupIndex];
    [group[index], group[index + by]] = [group[index + by], group[index]];
    const next = reordered.flat();
    startTransition(async () => {
      setItems(next);
      await setSystemOrder(next.map((s) => s.id));
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {groups.map((group, g) => (
        <section key={group.label} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</h2>
          <ul className="flex flex-col gap-2">
            {group.items.map((item, i) => (
              <li key={item.id} className="flex items-center gap-1 rounded-xl border border-border py-1.5 pl-4 pr-1.5">
                <span className="flex-1 truncate font-medium">{item.name}</span>
                <button
                  type="button"
                  onClick={() => move(g, i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${item.name} up`}
                  className="rounded-lg p-2.5 text-muted active:bg-surface disabled:opacity-25"
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => move(g, i, 1)}
                  disabled={i === group.items.length - 1}
                  aria-label={`Move ${item.name} down`}
                  className="rounded-lg p-2.5 text-muted active:bg-surface disabled:opacity-25"
                >
                  <ArrowDown size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
