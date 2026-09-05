"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { setPriority } from "@/app/(app)/today/actions";

type PickableGoal = { id: string; title: string; level: string };
type ChainLink = { id: string; title: string; level: string };

const LEVEL_LABEL: Record<string, string> = {
  dream: "Dream",
  "10yr": "10-year",
  "3yr": "3-year",
  "1yr": "1-year",
  quarter: "Quarter",
  month: "Month",
  week: "Week",
  today: "Today",
};

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
              {LEVEL_LABEL[goal.level] ?? goal.level}: {goal.title}
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
        <ol className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
          {chain.map((link) => (
            <li key={link.id} className="text-xs text-muted">
              <span className="text-fg">{LEVEL_LABEL[link.level] ?? link.level}</span>
              {" — "}
              {link.title}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
