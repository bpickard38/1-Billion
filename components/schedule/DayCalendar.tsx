"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { localMinutesSinceMidnight, instantToLocalTimeString } from "@/lib/dates";
import { categoryBlockClass, isProtectedCategory } from "@/lib/categories";
import { saveTodayAsTemplate, upsertScheduleBlock } from "@/app/(app)/today/actions";
import BlockEditor from "./BlockEditor";

const HOUR_HEIGHT = 56; // px per hour row
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SNAP_MINUTES = 15;
const LONG_PRESS_MS = 350; // touch: how long a hold has to last before a drag engages
const DRAG_START_PX = 5; // mouse: movement past this promotes a plain click into a drag
const SCROLL_CANCEL_PX = 10; // touch: movement past this before the hold finishes cancels the drag
const MIN_BLOCK_HEIGHT = 22;
const COMPACT_HEIGHT = 36; // below this, title + time share one line instead of stacking (fixes the time getting clipped on short blocks)

type Block = {
  id: string;
  start_at: string;
  end_at: string;
  title: string;
  category: string;
  google_recurring_event_id: string | null;
  recurrence_days: number[] | null;
};

type EditingState = {
  blockId?: string;
  startTime: string;
  endTime: string;
  title?: string;
  category?: string;
  recurringEventId?: string | null;
  recurrenceDays?: number[] | null;
};

type PendingDrag = {
  blockId: string;
  pointerId: number;
  pointerType: string;
  startClientY: number;
  originalTop: number;
  durationMin: number;
  block: Block;
};

type ActiveDrag = PendingDrag & { offsetTop: number };

function hourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function minutesToLabel(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = ((totalMinutes % 60) + 60) % 60;
  const period = h < 12 ? "AM" : "PM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${pad(m)} ${period}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snapMinutesToTop(minutes: number, durationMin: number): number {
  const snapped = clamp(Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES, 0, 24 * 60 - durationMin);
  return (snapped / 60) * HOUR_HEIGHT;
}

// Google-Calendar-style day view: hourly rows, tap an empty slot to add a
// block, tap a block to edit or delete it, press-and-drag a block to
// reschedule it — mouse drags as soon as it moves, touch needs a brief hold
// first (a plain scroll or tap shouldn't get mistaken for a move). Today's
// schedule_blocks only — no date navigation yet.
export default function DayCalendar({ blocks, timeZone }: { blocks: Block[]; timeZone: string }) {
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [drag, setDrag] = useState<ActiveDrag | null>(null);
  const [, startTransition] = useTransition();
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const pendingRef = useRef<PendingDrag | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const didDragRef = useRef(false);

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
          durationMin: endMin - startMin,
          top: (startMin / 60) * HOUR_HEIGHT,
          height: Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT),
        };
      }),
    [blocks, timeZone]
  );

  function clearPending() {
    pendingRef.current = null;
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function commitDrag(active: ActiveDrag) {
    const startMinutes = clamp(
      Math.round((active.offsetTop / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES,
      0,
      24 * 60 - active.durationMin
    );
    const endMinutes = startMinutes + active.durationMin;
    const startTime = `${pad(Math.floor(startMinutes / 60))}:${pad(startMinutes % 60)}`;
    const endTime = `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}`;

    startTransition(async () => {
      await upsertScheduleBlock({
        id: active.blockId,
        startTime,
        endTime,
        title: active.block.title,
        category: active.block.category,
        // A drag never touches the repeat picker, so if this block is part
        // of a series, default to moving just this one instance — matches
        // Google Calendar's own drag behavior.
        editScope: "this",
      });
    });
  }

  // Global listeners, not per-block handlers, since the pointer moves well
  // outside the small block element once a drag is underway.
  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      if (drag && e.pointerId === drag.pointerId) {
        const deltaY = e.clientY - drag.startClientY;
        const rawMinutes = ((drag.originalTop + deltaY) / HOUR_HEIGHT) * 60;
        const snappedTop = snapMinutesToTop(rawMinutes, drag.durationMin);
        if (snappedTop !== drag.offsetTop) {
          setDrag((d) => (d && d.pointerId === e.pointerId ? { ...d, offsetTop: snappedTop } : d));
        }
        return;
      }

      const pending = pendingRef.current;
      if (!pending || pending.pointerId !== e.pointerId) return;
      const deltaY = e.clientY - pending.startClientY;

      if (pending.pointerType === "mouse") {
        if (Math.abs(deltaY) >= DRAG_START_PX) {
          didDragRef.current = true;
          setDrag({ ...pending, offsetTop: pending.originalTop });
        }
      } else if (Math.abs(deltaY) >= SCROLL_CANCEL_PX) {
        // Moved before the hold finished — the user meant to scroll or
        // reposition their finger, not drag. Let the tap/scroll happen.
        clearPending();
      }
    }

    function handlePointerUp(e: PointerEvent) {
      if (drag && e.pointerId === drag.pointerId) {
        commitDrag(drag);
        setDrag(null);
      }
      if (pendingRef.current?.pointerId === e.pointerId) {
        clearPending();
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [drag]);

  function openNewBlock(hour: number) {
    setEditing({
      startTime: `${pad(hour)}:00`,
      endTime: hour < 23 ? `${pad(hour + 1)}:00` : "23:59",
    });
  }

  function openEditBlock(block: Block) {
    // A drag ending under the pointer still fires a native click right
    // after — swallow that one instead of also opening the editor.
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setEditing({
      blockId: block.id,
      startTime: instantToLocalTimeString(block.start_at, timeZone),
      endTime: instantToLocalTimeString(block.end_at, timeZone),
      title: block.title,
      category: block.category,
      recurringEventId: block.google_recurring_event_id,
      recurrenceDays: block.recurrence_days,
    });
  }

  function handleBlockPointerDown(block: Block, top: number, durationMin: number) {
    return (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const pending: PendingDrag = {
        blockId: block.id,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        startClientY: e.clientY,
        originalTop: top,
        durationMin,
        block,
      };
      pendingRef.current = pending;

      if (e.pointerType !== "mouse") {
        longPressTimerRef.current = window.setTimeout(() => {
          if (pendingRef.current?.blockId !== pending.blockId) return;
          didDragRef.current = true;
          setDrag({ ...pending, offsetTop: pending.originalTop });
          navigator.vibrate?.(15);
        }, LONG_PRESS_MS);
      }
    };
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

        {positioned.map(({ block, top, height, durationMin }) => {
          const isDragging = drag?.blockId === block.id;
          const renderTop = isDragging ? drag.offsetTop : top;
          const compact = height < COMPACT_HEIGHT;
          const startLabel = isDragging
            ? minutesToLabel(Math.round((drag.offsetTop / HOUR_HEIGHT) * 60))
            : instantToLocalTimeString(block.start_at, timeZone);
          const endLabel = isDragging
            ? minutesToLabel(Math.round((drag.offsetTop / HOUR_HEIGHT) * 60) + durationMin)
            : instantToLocalTimeString(block.end_at, timeZone);

          return (
            <button
              key={block.id}
              type="button"
              onPointerDown={handleBlockPointerDown(block, top, durationMin)}
              onClick={() => openEditBlock(block)}
              className={`absolute left-12 right-1 select-none overflow-hidden rounded border px-2 py-0.5 text-left text-xs ${categoryBlockClass(
                block.category
              )} ${isProtectedCategory(block.category) ? "border-l-4 border-l-accent" : ""} ${
                isDragging ? "z-20 cursor-grabbing shadow-lg" : "cursor-grab"
              }`}
              style={{ top: `${renderTop}px`, height: `${height}px`, touchAction: "none" }}
            >
              {compact ? (
                <span className="block truncate font-medium text-fg">
                  {startLabel} {block.title}
                </span>
              ) : (
                <>
                  <span className="block truncate font-medium text-fg">{block.title}</span>
                  <span className="block truncate text-muted">
                    {startLabel}–{endLabel}
                  </span>
                </>
              )}
            </button>
          );
        })}

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
          initialRecurringEventId={editing.recurringEventId}
          initialRecurrenceDays={editing.recurrenceDays}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
