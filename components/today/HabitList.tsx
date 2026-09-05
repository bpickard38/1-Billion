"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleHabit } from "@/app/(app)/today/actions";

type Habit = { id: string; name: string };

export default function HabitList({
  habits,
  initialDone,
  streaks,
}: {
  habits: Habit[];
  initialDone: Record<string, boolean>;
  streaks: Record<string, number>;
}) {
  const [done, setDone] = useOptimistic(
    initialDone,
    (state, update: { id: string; done: boolean }) => ({
      ...state,
      [update.id]: update.done,
    })
  );
  const [, startTransition] = useTransition();

  function handleToggle(habitId: string) {
    const next = !done[habitId];
    startTransition(async () => {
      setDone({ id: habitId, done: next });
      await toggleHabit(habitId, next);
    });
  }

  if (habits.length === 0) {
    return <p className="text-sm text-muted">No habits yet.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-2">
      {habits.map((habit) => {
        const checked = Boolean(done[habit.id]);
        const streak = streaks[habit.id] ?? 0;
        return (
          <li key={habit.id}>
            <button
              type="button"
              onClick={() => handleToggle(habit.id)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                checked ? "border-good/40 bg-good/10 text-fg" : "border-border text-muted"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  checked ? "border-good bg-good text-bg" : "border-border"
                }`}
              >
                {checked && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="flex-1">{habit.name}</span>
              {streak > 0 && (
                <span className="shrink-0 text-xs text-accent">🔥{streak}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
