"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  toggleScheduleBlockDone,
  upsertScheduleBlock,
  deleteScheduleBlock,
  saveTodayAsTemplate,
} from "@/app/(app)/today/actions";
import { currentAndNextBlock } from "@/lib/schedule";
import { instantToLocalTimeString } from "@/lib/dates";
import { CATEGORIES, categoryDotClass, isProtectedCategory } from "@/lib/categories";

type Block = {
  id: string;
  start_at: string;
  end_at: string;
  title: string;
  category: string;
  done: boolean;
};

export default function ScheduleSection({
  blocks,
  timeZone,
}: {
  blocks: Block[];
  timeZone: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<Block | "new" | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [, startTransition] = useTransition();

  const [done, setDone] = useOptimistic(
    Object.fromEntries(blocks.map((b) => [b.id, b.done])),
    (state, update: { id: string; done: boolean }) => ({ ...state, [update.id]: update.done })
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(
    () => [...blocks].sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [blocks]
  );

  const { current, next } = useMemo(() => currentAndNextBlock(sorted, now), [sorted, now]);

  function handleToggle(blockId: string) {
    const nextDone = !done[blockId];
    startTransition(async () => {
      setDone({ id: blockId, done: nextDone });
      await toggleScheduleBlockDone(blockId, nextDone);
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Schedule</h2>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted"
        >
          {expanded ? "Collapse" : "Full day"}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {sorted.length === 0 && <p className="text-sm text-muted">No blocks today.</p>}

      {!expanded && (current || next) && (
        <ul className="flex flex-col gap-2">
          {current && (
            <BlockRow
              block={current}
              checked={Boolean(done[current.id])}
              timeZone={timeZone}
              onToggle={() => handleToggle(current.id)}
              onEdit={() => setEditing(current)}
            />
          )}
          {next && next.id !== current?.id && (
            <BlockRow
              block={next}
              checked={Boolean(done[next.id])}
              timeZone={timeZone}
              onToggle={() => handleToggle(next.id)}
              onEdit={() => setEditing(next)}
            />
          )}
        </ul>
      )}

      {expanded && (
        <ul className="flex flex-col gap-2">
          {sorted.map((b) => (
            <BlockRow
              key={b.id}
              block={b}
              checked={Boolean(done[b.id])}
              timeZone={timeZone}
              onToggle={() => handleToggle(b.id)}
              onEdit={() => setEditing(b)}
            />
          ))}
        </ul>
      )}

      {expanded && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-muted"
          >
            <Plus size={14} />
            Add block
          </button>
          <button
            type="button"
            onClick={() => startTransition(async () => { await saveTodayAsTemplate(); })}
            className="rounded-lg border border-accent/60 px-3 py-2 text-xs text-accent"
          >
            Save today as template
          </button>
        </div>
      )}

      {editing && (
        <BlockEditor
          block={editing === "new" ? null : editing}
          timeZone={timeZone}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function BlockRow({
  block,
  checked,
  timeZone,
  onToggle,
  onEdit,
}: {
  block: Block;
  checked: boolean;
  timeZone: string;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm ${
        isProtectedCategory(block.category) ? "border-l-4 border-l-accent" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          checked ? "border-good bg-good text-bg" : "border-border"
        }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </button>
      <span className={`h-2 w-2 shrink-0 rounded-full ${categoryDotClass(block.category)}`} />
      <button type="button" onClick={onEdit} className="flex-1 truncate text-left">
        {block.title}
      </button>
      <span className="shrink-0 text-xs text-muted">
        {instantToLocalTimeString(block.start_at, timeZone)}–{instantToLocalTimeString(block.end_at, timeZone)}
      </span>
    </li>
  );
}

function BlockEditor({
  block,
  timeZone,
  onClose,
}: {
  block: Block | null;
  timeZone: string;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(
    block ? instantToLocalTimeString(block.start_at, timeZone) : "09:00"
  );
  const [endTime, setEndTime] = useState(
    block ? instantToLocalTimeString(block.end_at, timeZone) : "10:00"
  );
  const [title, setTitle] = useState(block?.title ?? "");
  const [category, setCategory] = useState<string>(block?.category ?? CATEGORIES[0]);
  const [, startTransition] = useTransition();

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await upsertScheduleBlock({ id: block?.id, startTime, endTime, title: title.trim(), category });
      onClose();
    });
  }

  function remove() {
    if (!block) return;
    startTransition(async () => {
      await deleteScheduleBlock(block.id);
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
