"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { generatePlan } from "@/app/(app)/exercise/actions";

export default function PlanForm({
  initialGoals,
  initialSchedule,
  initialNotes,
  hasPlan,
}: {
  initialGoals: string;
  initialSchedule: string;
  initialNotes: string;
  hasPlan: boolean;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await generatePlan({ goals, schedule, notes });
      if ("error" in result) setError(result.error);
    });
  }

  const input = "w-full resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-base outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-muted">Goals</span>
        <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} maxLength={2000} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-muted">Weekly schedule</span>
        <textarea value={schedule} onChange={(e) => setSchedule(e.target.value)} rows={3} maxLength={1000} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-muted">Level, equipment, injuries (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="e.g. 10 pull-ups, can hold a wall handstand 20 s, have rings and parallettes"
          className={input}
        />
      </label>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || !goals.trim()}
        className="flex items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-white active:opacity-80 disabled:opacity-50"
      >
        <Sparkles size={18} />
        {pending ? "Building your plan… (up to a minute)" : hasPlan ? "Rebuild my plan" : "Make my plan"}
      </button>
    </div>
  );
}
