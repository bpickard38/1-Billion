"use client";

import { useMemo, useState, useTransition } from "react";
import { upsertGoal } from "@/app/(app)/goals/actions";
import { GOAL_LEVELS, LEVEL_LABEL, parentLevelOf } from "@/lib/goals";

export type EditableGoal = {
  id: string;
  level: string;
  parent_id: string | null;
  title: string;
  target_value: number | null;
  target_unit: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: string;
};

export default function GoalEditor({
  goal,
  allGoals,
  onClose,
}: {
  goal?: EditableGoal;
  allGoals: EditableGoal[];
  onClose: () => void;
}) {
  const [level, setLevel] = useState<string>(goal?.level ?? "week");
  const parentLevel = parentLevelOf(level);
  const parentOptions = useMemo(
    () => (parentLevel ? allGoals.filter((g) => g.level === parentLevel) : []),
    [allGoals, parentLevel]
  );
  const [parentId, setParentId] = useState<string | null>(
    goal?.parent_id ?? parentOptions[0]?.id ?? null
  );
  const [title, setTitle] = useState(goal?.title ?? "");
  const [targetValue, setTargetValue] = useState(goal?.target_value?.toString() ?? "");
  const [targetUnit, setTargetUnit] = useState(goal?.target_unit ?? "");
  const [startsOn, setStartsOn] = useState(goal?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(goal?.ends_on ?? "");
  const [status, setStatus] = useState(goal?.status ?? "active");
  const [, startTransition] = useTransition();

  function handleLevelChange(nextLevel: string) {
    setLevel(nextLevel);
    const nextParentLevel = parentLevelOf(nextLevel);
    const candidates = nextParentLevel ? allGoals.filter((g) => g.level === nextParentLevel) : [];
    setParentId(candidates[0]?.id ?? null);
  }

  function save() {
    if (!title.trim()) return;
    if (parentLevel && !parentId) return;
    startTransition(async () => {
      await upsertGoal({
        id: goal?.id,
        level,
        parentId: parentLevel ? parentId : null,
        title: title.trim(),
        targetValue: targetValue.trim() ? Number(targetValue) : null,
        targetUnit: targetUnit.trim() || null,
        startsOn: startsOn || null,
        endsOn: endsOn || null,
        status,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{goal ? "Edit goal" : "Add goal"}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Level
            <select
              value={level}
              onChange={(e) => handleLevelChange(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            >
              {GOAL_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          </label>

          {parentLevel && (
            <label className="flex flex-col gap-1 text-sm">
              Parent ({LEVEL_LABEL[parentLevel]})
              <select
                value={parentId ?? ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              >
                <option value="" disabled>
                  {parentOptions.length ? "Choose a parent" : `No ${LEVEL_LABEL[parentLevel]} goals yet`}
                </option>
                {parentOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Target value
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Unit
              <input
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                placeholder="interviews"
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Starts
              <input
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Ends
              <input
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="done">Done</option>
              <option value="dropped">Dropped</option>
            </select>
          </label>

          <button
            type="button"
            onClick={save}
            className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
