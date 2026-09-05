"use client";

import { useState, useTransition } from "react";
import { upsertScheduleBlock, deleteScheduleBlock } from "@/app/(app)/today/actions";
import { CATEGORIES } from "@/lib/categories";

// Add/edit/delete sheet for a single schedule_blocks row (today only, for
// now — the calendar-grid day view in app/(app)/schedule doesn't yet
// support other dates).
export default function BlockEditor({
  blockId,
  initialStartTime,
  initialEndTime,
  initialTitle = "",
  initialCategory = CATEGORIES[0],
  onClose,
}: {
  blockId?: string;
  initialStartTime: string;
  initialEndTime: string;
  initialTitle?: string;
  initialCategory?: string;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<string>(initialCategory);
  const [, startTransition] = useTransition();

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await upsertScheduleBlock({ id: blockId, startTime, endTime, title: title.trim(), category });
      onClose();
    });
  }

  function remove() {
    if (!blockId) return;
    startTransition(async () => {
      await deleteScheduleBlock(blockId);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="w-full rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{blockId ? "Edit block" : "Add block"}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Start
              <input
                type="time"
                step={900}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              End
              <input
                type="time"
                step={900}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg"
            >
              Save
            </button>
            {blockId && (
              <button
                type="button"
                onClick={remove}
                className="rounded-lg border border-bad/60 px-3 py-2 text-sm text-bad"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
