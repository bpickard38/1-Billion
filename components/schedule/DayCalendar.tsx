"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { localMinutesSinceMidnight, instantToLocalTimeString } from "@/lib/dates";
import { categoryBlockClass, isProtectedCategory } from "@/lib/categories";
import { saveTodayAsTemplate } from "@/app/(app)/today/actions";
import BlockEditor from "./BlockEditor";

const HOUR_HEIGHT = 56; // px per hour row
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Block = {
  id: string;
  start_at: string;
  end_at: string;
  title: string;
  category: string;
};

type EditingState = {
  blockId?: string;
  startTime: string;
  endTime: string;
  title?: string;
  category?: string;
};

function hourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// Google-Calendar-style day view: hourly rows, tap an empty slot to add a
// block, tap a block to edit or delete it. Today's schedule_blocks only —
// no date navigation yet (this is still Phase 3's standalone schedule, not
// the Phase 10 Google sync).
export default function DayCalendar({ blocks, timeZone }: { blocks: Block[]; timeZone: string }) {
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [, startTransition] = useTransition();
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrolledRef.current) return;
    scrolledRef.current = true;
    nowLineRef.current?.scrollIntoView({ block: "center" });
  }, []);

  const nowMinutes = localMinutesSinceMidnight(now, timeZone);

  const positioned = useMemo(
    () =>
      blocks.map((block) => {
        const startMin = localMinutesSinceMidnight(block.start_at, timeZone);
        const rawEndMin = localMinutesSinceMidnight(block.end_at, timeZone);
        const endMin = rawEndMin > startMin ? rawEndMin : 24 * 60;
        return {
          block,
          top: (startMin / 60) * HOUR_HEIGHT,
          height: Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 22),
        };
      }),
    [blocks, timeZone]
  );

  function openNewBlock(hour: number) {
    setEditing({
      startTime: `${pad(hour)}:00`,
      endTime: hour < 23 ? `${pad(hour + 1)}:00` : "23:59",
    });
  }

  function openEditBlock(block: Block) {
    setEditing({
      blockId: block.id,
      startTime: instantToLocalTimeString(block.start_at, timeZone),
      endTime: instantToLocalTimeString(block.end_at, timeZone),
      title: block.title,
      category: block.category,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            await saveTodayAsTemplate();
          })
        }
        className="self-end rounded-lg border border-accent/60 px-3 py-1.5 text-xs text-accent"
      >
        Save today as template
      </button>

      <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
        {HOURS.map((hour) => (
          <button
            key={hour}
            type="button"
            onClick={() => openNewBlock(hour)}
            className="absolute inset-x-0 flex items-start border-t border-border text-left"
            style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          >
            <span className="w-12 shrink-0 pl-1 pt-0.5 text-[11px] text-muted">
              {hourLabel(hour)}
            </span>
          </button>
        ))}

        {positioned.map(({ block, top, height }) => (
          <button
            key={block.id}
            type="button"
            onClick={() => openEditBlock(block)}
            className={`absolute left-12 right-1 overflow-hidden rounded border px-2 py-1 text-left text-xs ${categoryBlockClass(
              block.category
            )} ${isProtectedCategory(block.category) ? "border-l-4 border-l-accent" : ""}`}
            style={{ top: `${top}px`, height: `${height}px` }}
          >
            <span className="block truncate font-medium text-fg">{block.title}</span>
            <span className="block truncate text-muted">
              {instantToLocalTimeString(block.start_at, timeZone)}–
              {instantToLocalTimeString(block.end_at, timeZone)}
            </span>
          </button>
        ))}

        <div
          ref={nowLineRef}
          className="pointer-events-none absolute inset-x-0 flex items-center"
          style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT}px` }}
        >
          <span className="ml-10 h-2 w-2 shrink-0 rounded-full bg-bad" />
          <span className="h-px flex-1 bg-bad" />
        </div>
      </div>

      {editing && (
        <BlockEditor
          blockId={editing.blockId}
          initialStartTime={editing.startTime}
          initialEndTime={editing.endTime}
          initialTitle={editing.title}
          initialCategory={editing.category}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
