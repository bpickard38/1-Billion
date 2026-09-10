"use client";

import { useState, useTransition } from "react";
import { upsertScheduleBlock, deleteScheduleBlock } from "@/app/(app)/today/actions";
import { CATEGORIES } from "@/lib/categories";

const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Mon" },
  { iso: 2, label: "Tue" },
  { iso: 3, label: "Wed" },
  { iso: 4, label: "Thu" },
  { iso: 5, label: "Fri" },
  { iso: 6, label: "Sat" },
  { iso: 7, label: "Sun" },
];
const ALL_DAYS = WEEKDAYS.map((d) => d.iso);

function sameDaySet(a: number[], b: number[]): boolean {
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

// Add/edit/delete sheet for a single schedule_blocks row (today only, for
// now — the calendar-grid day view in app/(app)/schedule doesn't yet
// support other dates). A block that's part of a Google recurring series
// (initialRecurringEventId set) offers "this event" vs "all events" for
// save/delete, matching Google Calendar's own recurrence UI, unless the
// Repeat picker itself was touched — a day-selection change always applies
// to the whole series (see today/actions.ts#upsertScheduleBlock).
export default function BlockEditor({
  blockId,
  initialStartTime,
  initialEndTime,
  initialTitle = "",
  initialCategory = CATEGORIES[0],
  initialRecurringEventId = null,
  initialRecurrenceDays = null,
  onClose,
}: {
  blockId?: string;
  initialStartTime: string;
  initialEndTime: string;
  initialTitle?: string;
  initialCategory?: string;
  initialRecurringEventId?: string | null;
  initialRecurrenceDays?: number[] | null;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState<string>(initialCategory);
  const [repeatDays, setRepeatDays] = useState<number[]>(initialRecurrenceDays ?? []);
  const [, startTransition] = useTransition();

  const isPartOfSeries = Boolean(initialRecurringEventId);
  const daysChanged = !sameDaySet(repeatDays, initialRecurrenceDays ?? []);
  const needsScopeChoice = isPartOfSeries && !daysChanged;

  function toggleDay(iso: number) {
    setRepeatDays((days) => (days.includes(iso) ? days.filter((d) => d !== iso) : [...days, iso].sort((a, b) => a - b)));
  }

  function save(scope?: "this" | "all") {
    if (!title.trim()) return;
    startTransition(async () => {
      await upsertScheduleBlock({
        id: blockId,
        startTime,
        endTime,
        title: title.trim(),
        category,
        // Sending [] (not undefined) when a series' picker was cleared is
        // what tells the action "take this out of its series" rather than
        // "the picker was never touched" — see ScheduleBlockInput's comment.
        repeatDays: repeatDays.length > 0 ? repeatDays : isPartOfSeries ? [] : undefined,
        editScope: scope,
      });
      onClose();
    });
  }

  function remove(scope?: "this" | "all") {
    if (!blockId) return;
    startTransition(async () => {
      await deleteScheduleBlock(blockId, scope);
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

          <div className="flex flex-col gap-1 text-sm">
            Repeat
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map(({ iso, label }) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => toggleDay(iso)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    repeatDays.includes(iso) ? "border-accent bg-accent/20 text-accent" : "border-border text-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRepeatDays(sameDaySet(repeatDays, ALL_DAYS) ? [] : ALL_DAYS)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted"
              >
                {sameDaySet(repeatDays, ALL_DAYS) ? "Clear" : "Every day"}
              </button>
            </div>
            {daysChanged && isPartOfSeries && (
              <p className="text-xs text-muted">Changing repeat days replaces the whole series.</p>
            )}
          </div>

          <div className="mt-1 flex flex-col gap-2">
            {needsScopeChoice ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => save("this")}
                  className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg"
                >
                  Save: this event
                </button>
                <button
                  type="button"
                  onClick={() => save("all")}
                  className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg"
                >
                  Save: all events
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => save()}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg"
              >
                Save
              </button>
            )}

            {blockId &&
              (needsScopeChoice ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => remove("this")}
                    className="flex-1 rounded-lg border border-bad/60 px-3 py-2 text-sm text-bad"
                  >
                    Delete: this event
                  </button>
                  <button
                    type="button"
                    onClick={() => remove("all")}
                    className="flex-1 rounded-lg border border-bad/60 px-3 py-2 text-sm text-bad"
                  >
                    Delete: all events
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => remove()}
                  className="rounded-lg border border-bad/60 px-3 py-2 text-sm text-bad"
                >
                  Delete
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
