"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { setPriority } from "@/app/(app)/today/actions";
import GoalChain from "@/components/goals/GoalChain";
import { LEVEL_LABEL, type ChainLink, type GoalLevel } from "@/lib/goals";

type PickableGoal = { id: string; title: string; level: string };

export default function PriorityCard({
  initialText,
  initialGoalId,
  pickableGoals,
  chain,
}: {
  initialText: string;
  initialGoalId: string | null;
  pickableGoals: PickableGoal[];
  chain: ChainLink[];
}) {
  const [text, setText] = useState(initialText);
  const [goalId, setGoalId] = useState(initialGoalId);
  const [chainOpen, setChainOpen] = useState(false);
  const [, startTransition] = useTransition();

  function save(nextText: string, nextGoalId: string | null) {
    startTransition(async () => {
      await setPriority(nextText, nextGoalId);
    });
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <label className="text-xs text-muted">#1 priority today</label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => save(text, goalId)}
        placeholder="What's the one thing?"
        className="mt-1 w-full bg-transparent text-base outline-none"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <select
          value={goalId ?? ""}
          onChange={(e) => {
            const next = e.target.value || null;
            setGoalId(next);
            save(text, next);
          }}
          className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs text-muted"
        >
          <option value="">No linked goal</option>
          {pickableGoals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {LEVEL_LABEL[goal.level as GoalLevel] ?? goal.level}: {goal.title}
            </option>
          ))}
        </select>

        {goalId && chain.length > 0 && (
          <button
            type="button"
            onClick={() => setChainOpen((open) => !open)}
            className="flex shrink-0 items-center gap-1 text-xs text-muted"
          >
            Path to Dream
            {chainOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {chainOpen && chain.length > 0 && (
        <div className="mt-2">
          <GoalChain chain={chain} />
        </div>
      )}
    </div>
  );
}
