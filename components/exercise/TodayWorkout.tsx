"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { TutorialLink } from "@/components/exercise/WorkoutDay";
import { finishWorkout, logExercise } from "@/app/(app)/exercise/actions";
import { formatTarget, parseSetValue, unitLabel, type Exercise } from "@/lib/workout";

type Logged = Record<string, (number | null)[]>;

/**
 * Today's workout: one box per set to type reps / seconds / minutes. Each
 * exercise saves when you leave a box. Finish asks the AI to progress it.
 */
export default function TodayWorkout({
  exercises,
  logged,
  last,
  progressNote,
  finishedToday,
}: {
  exercises: Exercise[];
  logged: Logged;
  last: Record<string, { date: string; results: (number | null)[] }>;
  progressNote: string | null;
  finishedToday: boolean;
}) {
  // Text in each box, keyed by exercise name.
  const [values, setValues] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      exercises.map((ex) => [
        ex.name,
        Array.from({ length: ex.sets }, (_, i) => {
          const v = logged[ex.name]?.[i];
          return v === null || v === undefined ? "" : String(v);
        }),
      ])
    )
  );
  const [saved, setSaved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(exercises.map((ex) => [ex.name, Boolean(logged[ex.name]?.some((v) => v !== null))]))
  );
  const [error, setError] = useState<string | null>(null);
  const [, startSave] = useTransition();
  const [finishing, startFinish] = useTransition();

  const results = (ex: Exercise) => (values[ex.name] ?? []).map(parseSetValue);

  function change(ex: Exercise, set: number, text: string) {
    setValues((v) => ({ ...v, [ex.name]: (v[ex.name] ?? []).map((old, i) => (i === set ? text : old)) }));
    setSaved((s) => ({ ...s, [ex.name]: false }));
  }

  function save(ex: Exercise) {
    const r = results(ex);
    startSave(async () => {
      try {
        await logExercise({ name: ex.name, unit: ex.unit, results: r });
        setSaved((s) => ({ ...s, [ex.name]: r.some((v) => v !== null) }));
      } catch {
        setError("Couldn't save. Check your connection.");
      }
    });
  }

  function finish() {
    setError(null);
    startFinish(async () => {
      const result = await finishWorkout(exercises.map((ex) => ({ name: ex.name, unit: ex.unit, results: results(ex) })));
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {exercises.map((ex) => {
        const prev = last[ex.name];
        return (
          <div key={ex.name} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  {ex.name}
                  {saved[ex.name] && <Check size={14} className="text-good" aria-label="Saved" />}
                </p>
                <p className="text-sm text-muted">
                  {formatTarget(ex)}
                  {ex.note && ` · ${ex.note}`}
                </p>
                {prev && (
                  <p className="text-xs text-muted">
                    Last time: {prev.results.map((v) => (v === null ? "–" : v)).join(", ")} {unitLabel(ex.unit)}
                  </p>
                )}
              </div>
              <TutorialLink name={ex.name} />
            </div>
            <div className="flex flex-wrap gap-2">
              {(values[ex.name] ?? []).map((text, i) => (
                <label key={i} className="flex flex-col items-center gap-0.5">
                  <input
                    value={text}
                    onChange={(e) => change(ex, i, e.target.value)}
                    onBlur={() => save(ex)}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    placeholder={String(ex.high)}
                    aria-label={`${ex.name} set ${i + 1} ${ex.unit}`}
                    className="h-11 w-14 rounded-lg border border-border bg-bg text-center text-base outline-none placeholder:text-muted/50 focus:border-accent"
                  />
                  <span className="text-[10px] text-muted">
                    {ex.sets === 1 ? unitLabel(ex.unit) : `set ${i + 1}`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {finishedToday && progressNote && (
        <p className="flex gap-2 rounded-xl bg-good/10 p-3 text-sm">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-good" />
          <span>{progressNote}</span>
        </p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}

      <button
        type="button"
        onClick={finish}
        disabled={finishing}
        className="rounded-xl bg-accent py-3 font-semibold text-white active:opacity-80 disabled:opacity-50"
      >
        {finishing ? "Saving and updating your plan…" : finishedToday ? "Update next workout again" : "Finish workout"}
      </button>
      <p className="-mt-2 text-center text-xs text-muted">
        AI raises your targets (or moves you to a harder version) based on what you did.
      </p>
    </div>
  );
}
