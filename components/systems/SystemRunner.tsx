"use client";

import { useOptimistic, useTransition } from "react";
import CheckCircle from "@/components/systems/CheckCircle";
import { setStepDone, setSystemDone } from "@/app/(app)/systems/actions";

type State = { ticked: string[]; done: boolean };
type Action = { type: "step"; stepId: string; on: boolean } | { type: "all"; on: boolean };

/** The workflow: tick steps as you go, or mark the whole system at once. */
export default function SystemRunner({
  systemId,
  steps,
  initialTicked,
  initialDone,
}: {
  systemId: string;
  steps: { id: string; title: string }[];
  initialTicked: string[];
  initialDone: boolean;
}) {
  const allIds = steps.map((s) => s.id);
  const [state, apply] = useOptimistic<State, Action>(
    { ticked: initialTicked, done: initialDone },
    (current, action) => {
      if (action.type === "all") return { ticked: action.on ? allIds : [], done: action.on };
      const ticked = action.on
        ? [...new Set([...current.ticked, action.stepId])]
        : current.ticked.filter((id) => id !== action.stepId);
      return { ticked, done: allIds.every((id) => ticked.includes(id)) };
    }
  );
  const [, startTransition] = useTransition();

  // A system checked off before a step was added still reads as fully done.
  const isTicked = (id: string) => state.done || state.ticked.includes(id);
  const tickedCount = state.done ? steps.length : steps.filter((s) => state.ticked.includes(s.id)).length;

  function toggleStep(stepId: string) {
    const on = !isTicked(stepId);
    startTransition(async () => {
      apply({ type: "step", stepId, on });
      await setStepDone(systemId, stepId, on);
    });
  }

  function toggleAll() {
    const on = !state.done;
    startTransition(async () => {
      apply({ type: "all", on });
      await setSystemDone(systemId, on);
    });
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-good transition-all"
            style={{ width: `${steps.length ? (tickedCount / steps.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs text-muted">
          {tickedCount}/{steps.length}
        </span>
      </div>

      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const ticked = isTicked(step.id);
          return (
            <li key={step.id}>
              <button type="button" onClick={() => toggleStep(step.id)} className="flex w-full gap-3 text-left">
                <div className="flex flex-col items-center">
                  <CheckCircle checked={ticked} size="md" label={ticked ? undefined : String(i + 1)} />
                  {i < steps.length - 1 && <span className={`w-px flex-1 ${ticked ? "bg-good/40" : "bg-border"}`} />}
                </div>
                <p className={`pb-5 pt-0.5 ${ticked ? "text-muted line-through" : ""}`}>{step.title}</p>
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={toggleAll}
        className={`mt-2 flex w-full items-center justify-center gap-3 rounded-xl border py-4 font-semibold transition-colors ${
          state.done ? "border-good/30 bg-good/10 text-good" : "border-accent bg-accent text-white active:opacity-80"
        }`}
      >
        {state.done ? <CheckCircle checked size="lg" /> : <span className="h-8 w-8 rounded-full border-2 border-white/80" />}
        {state.done ? "Done for today" : "Mark all done"}
      </button>
    </>
  );
}
