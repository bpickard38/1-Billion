"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { toggleScheduleBlockDone } from "@/app/(app)/today/actions";
import { currentAndNextBlock } from "@/lib/schedule";
import { instantToLocalTimeString } from "@/lib/dates";
import { categoryDotClass, isProtectedCategory } from "@/lib/categories";

type Block = {
  id: string;
  start_at: string;
  end_at: string;
  title: string;
  category: string;
  done: boolean;
};

// Compact "check it off" view for Today. Adding, editing, and deleting
// blocks lives on the /schedule tab's Google-Calendar-style day view.
export default function ScheduleSection({
  blocks,
  timeZone,
}: {
  blocks: Block[];
  timeZone: string;
}) {
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
        <Link href="/schedule" className="text-xs text-muted">
          Full schedule →
        </Link>
      </div>

      {sorted.length === 0 && <p className="text-sm text-muted">No blocks today.</p>}

      {(current || next) && (
        <ul className="flex flex-col gap-2">
          {current && (
            <BlockRow
              block={current}
              checked={Boolean(done[current.id])}
              timeZone={timeZone}
              onToggle={() => handleToggle(current.id)}
            />
          )}
          {next && next.id !== current?.id && (
            <BlockRow
              block={next}
              checked={Boolean(done[next.id])}
              timeZone={timeZone}
              onToggle={() => handleToggle(next.id)}
            />
          )}
        </ul>
      )}
    </section>
  );
}

function BlockRow({
  block,
  checked,
  timeZone,
  onToggle,
}: {
  block: Block;
  checked: boolean;
  timeZone: string;
  onToggle: () => void;
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
      <span className="flex-1 truncate">{block.title}</span>
      <span className="shrink-0 text-xs text-muted">
        {instantToLocalTimeString(block.start_at, timeZone)}–{instantToLocalTimeString(block.end_at, timeZone)}
      </span>
    </li>
  );
}
