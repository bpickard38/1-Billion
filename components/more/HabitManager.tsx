"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { updateHabit, deleteHabit, addHabit } from "@/app/(app)/today/actions";

const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "M" },
  { iso: 2, label: "Tu" },
  { iso: 3, label: "W" },
  { iso: 4, label: "Th" },
  { iso: 5, label: "F" },
  { iso: 6, label: "Sa" },
  { iso: 7, label: "Su" },
];

type Habit = { id: string; name: string; days_of_week: number[]; active: boolean };

function HabitRow({ habit }: { habit: Habit }) {
  const [name, setName] = useState(habit.name);
  const [days, setDays] = useState<number[]>(habit.days_of_week);
  const [active, setActive] = useState(habit.active);
  const [isPending, startTransition] = useTransition();

  function save(next: Partial<{ name: string; days: number[]; active: boolean }>) {
    const nextName = next.name ?? name;
    const nextDays = next.days ?? days;
    const nextActive = next.active ?? active;
    startTransition(() =>
      updateHabit(habit.id, { name: nextName, daysOfWeek: nextDays, active: nextActive })
    );
  }

  function toggleDay(iso: number) {
    const next = days.includes(iso) ? days.filter((d) => d !== iso) : [...days, iso].sort((a, b) => a - b);
    if (next.length === 0) return; // a habit needs at least one scheduled day
    setDays(next);
    save({ days: next });
  }

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && save({ name })}
          disabled={isPending}
          className={`flex-1 rounded border border-border bg-transparent px-2 py-1.5 text-sm ${
            active ? "" : "text-muted line-through"
          }`}
        />
        <button
          type="button"
          onClick={() => {
            const next = !active;
            setActive(next);
            save({ active: next });
          }}
          disabled={isPending}
          className="shrink-0 rounded border border-border px-2 py-1.5 text-xs text-muted"
        >
          {active ? "Active" : "Paused"}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => deleteHabit(habit.id))}
          disabled={isPending}
          className="shrink-0 text-bad"
          aria-label={`Delete ${habit.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {WEEKDAYS.map(({ iso, label }) => (
          <button
            key={iso}
            type="button"
            onClick={() => toggleDay(iso)}
            disabled={isPending}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              days.includes(iso) ? "border-accent bg-accent/20 text-accent" : "border-border text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </li>
  );
}

export default function HabitManager({ habits }: { habits: Habit[] }) {
  const [newName, setNewName] = useState("");
  const [, startTransition] = useTransition();

  function submitNew() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(() => addHabit(trimmed));
    setNewName("");
  }

  return (
    <div className="flex flex-col gap-2">
      {habits.length === 0 && <p className="text-sm text-muted">No habits yet.</p>}
      <ul className="flex flex-col gap-2">
        {habits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} />
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNew()}
          placeholder="New habit name"
          className="flex-1 rounded border border-border bg-transparent px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={submitNew}
          className="rounded border border-accent/60 px-3 py-1.5 text-sm text-accent"
        >
          Add
        </button>
      </div>
    </div>
  );
}
