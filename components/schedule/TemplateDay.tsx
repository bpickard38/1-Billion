"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { upsertTemplateBlock, deleteTemplateBlock } from "@/app/(app)/more/schedule/actions";
import { CATEGORIES, categoryDotClass, isProtectedCategory } from "@/lib/categories";

export type TemplateBlock = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  title: string;
  category: string;
};

// Postgres `time` comes back as "HH:MM:SS"; <input type="time"> wants "HH:MM".
function toHHMM(time: string) {
  return time.slice(0, 5);
}

export default function TemplateDay({
  weekday,
  label,
  blocks,
}: {
  weekday: number;
  label: string;
  blocks: TemplateBlock[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateBlock | "new" | null>(null);

  const sorted = [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold"
      >
        {label}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <>
          <ul className="flex flex-col gap-2">
            {sorted.length === 0 && <li className="text-sm text-muted">No blocks.</li>}
            {sorted.map((b) => (
              <li
                key={b.id}
                className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm ${
                  isProtectedCategory(b.category) ? "border-l-4 border-l-accent" : ""
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${categoryDotClass(b.category)}`} />
                <button type="button" onClick={() => setEditing(b)} className="flex-1 truncate text-left">
                  {b.title}
                </button>
                <span className="shrink-0 text-xs text-muted">
                  {toHHMM(b.start_time)}–{toHHMM(b.end_time)}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-muted"
          >
            <Plus size={14} />
            Add block
          </button>
        </>
      )}

      {editing && (
        <TemplateBlockEditor
          weekday={weekday}
          block={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function TemplateBlockEditor({
  weekday,
  block,
  onClose,
}: {
  weekday: number;
  block: TemplateBlock | null;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(block ? toHHMM(block.start_time) : "09:00");
  const [endTime, setEndTime] = useState(block ? toHHMM(block.end_time) : "10:00");
  const [title, setTitle] = useState(block?.title ?? "");
  const [category, setCategory] = useState<string>(block?.category ?? CATEGORIES[0]);
  const [, startTransition] = useTransition();

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await upsertTemplateBlock({
        id: block?.id,
        weekday,
        startTime,
        endTime,
        title: title.trim(),
        category,
      });
      onClose();
    });
  }

  function remove() {
    if (!block) return;
    startTransition(async () => {
      await deleteTemplateBlock(block.id);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="w-full rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{block ? "Edit block" : "Add block"}</h2>
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
            {block && (
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
