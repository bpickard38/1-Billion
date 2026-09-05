"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Waypoints } from "lucide-react";
import GoalEditor, { type EditableGoal } from "./GoalEditor";
import GoalChain from "./GoalChain";
import { LEVEL_LABEL, buildChainFromMap, computeProgressPct, type GoalLevel } from "@/lib/goals";

type Goal = EditableGoal;

export default function GoalTree({ goals }: { goals: Goal[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const dream = goals.find((g) => g.level === "dream");
    return new Set(dream ? [dream.id] : []);
  });
  const [chainOpenId, setChainOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);

  const goalsById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Goal[]>();
    for (const g of goals) {
      if (!g.parent_id) continue;
      if (!map.has(g.parent_id)) map.set(g.parent_id, []);
      map.get(g.parent_id)!.push(g);
    }
    return map;
  }, [goals]);

  const roots = useMemo(() => goals.filter((g) => !g.parent_id), [goals]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setEditing("new")}
        className="flex items-center justify-center gap-1 self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted"
      >
        <Plus size={14} />
        Add goal
      </button>

      {roots.length === 0 && <p className="text-sm text-muted">No goals yet.</p>}

      <ul className="flex flex-col gap-1">
        {roots.map((g) => (
          <GoalNode
            key={g.id}
            goal={g}
            childrenByParent={childrenByParent}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onEdit={setEditing}
            chainOpenId={chainOpenId}
            onToggleChain={(id) => setChainOpenId((cur) => (cur === id ? null : id))}
            goalsById={goalsById}
          />
        ))}
      </ul>

      {editing && (
        <GoalEditor
          goal={editing === "new" ? undefined : editing}
          allGoals={goals}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function GoalNode({
  goal,
  childrenByParent,
  expanded,
  onToggleExpand,
  onEdit,
  chainOpenId,
  onToggleChain,
  goalsById,
}: {
  goal: Goal;
  childrenByParent: Map<string, Goal[]>;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (goal: Goal) => void;
  chainOpenId: string | null;
  onToggleChain: (id: string) => void;
  goalsById: Map<string, Goal>;
}) {
  const children = childrenByParent.get(goal.id) ?? [];
  const isExpanded = expanded.has(goal.id);
  const progressPct =
    children.length > 0
      ? computeProgressPct(children.filter((c) => c.status === "done").length, children.length)
      : null;

  return (
    <li>
      <div className="flex items-center gap-1 py-1.5">
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => onToggleExpand(goal.id)}
            className="shrink-0 text-muted"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <button type="button" onClick={() => onEdit(goal)} className="flex-1 text-left">
          <span className="block text-[10px] uppercase tracking-wide text-muted">
            {LEVEL_LABEL[goal.level as GoalLevel] ?? goal.level}
          </span>
          <span
            className={`block truncate text-sm ${
              goal.status === "dropped"
                ? "text-muted line-through"
                : goal.status === "done"
                  ? "text-good"
                  : "text-fg"
            }`}
          >
            {goal.title}
          </span>
        </button>

        {progressPct !== null && <span className="shrink-0 text-xs text-muted">{progressPct}%</span>}

        <button
          type="button"
          onClick={() => onToggleChain(goal.id)}
          className="shrink-0 text-muted"
          aria-label="Path to Dream"
        >
          <Waypoints size={14} />
        </button>
      </div>

      {chainOpenId === goal.id && (
        <div className="ml-5 pb-2">
          <GoalChain chain={buildChainFromMap(goalsById, goal.id)} />
        </div>
      )}

      {isExpanded && children.length > 0 && (
        <ul className="ml-5 flex flex-col gap-1 border-l border-border pl-2">
          {children.map((child) => (
            <GoalNode
              key={child.id}
              goal={child}
              childrenByParent={childrenByParent}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              chainOpenId={chainOpenId}
              onToggleChain={onToggleChain}
              goalsById={goalsById}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
