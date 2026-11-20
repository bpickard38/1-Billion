"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import VoiceButton from "@/components/systems/VoiceButton";
import { draftAreaPlan, saveAreaPlan } from "@/app/(app)/areas/actions";
import { AREA_INFO, type Area, type PlannedTask } from "@/lib/areas";
import { formatDays, TIME_LABELS } from "@/lib/systems";

/** Goals box -> AI draft -> pick which tasks to keep -> save. */
export default function AreaPlanner({
  area,
  initialGoals,
  hasTasks,
}: {
  area: Area;
  initialGoals: string;
  hasTasks: boolean;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [draft, setDraft] = useState<{ summary: string; tasks: PlannedTask[] } | null>(null);
  const [keep, setKeep] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drafting, startDraft] = useTransition();
  const [saving, startSave] = useTransition();

  function plan(text = goals) {
    setError(null);
    startDraft(async () => {
      const result = await draftAreaPlan(area, text);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDraft(result);
      setKeep(result.tasks.map(() => true));
    });
  }

  function save() {
    if (!draft) return;
    setError(null);
    startSave(async () => {
      const result = await saveAreaPlan(area, draft.summary, draft.tasks.filter((_, i) => keep[i]));
      if ("error" in result) setError(result.error);
      else setDraft(null);
    });
  }

  const input =
    "w-full resize-none rounded-lg border border-border bg-bg px-3 py-2.5 text-base outline-none focus:border-accent";

  if (draft) {
    const count = keep.filter(Boolean).length;
    return (
      <section className="flex flex-col gap-3 rounded-xl bg-surface p-4">
        <h2 className="text-sm font-semibold">Proposed week</h2>
        {draft.summary && <p className="text-sm text-muted">{draft.summary}</p>}
        <ul className="flex flex-col gap-2">
          {draft.tasks.map((t, i) => (
            <li key={i}>
              <label className="flex gap-3 rounded-lg border border-border bg-bg p-3">
                <input
                  type="checkbox"
                  checked={keep[i] ?? false}
                  onChange={(e) => setKeep((k) => k.map((v, j) => (j === i ? e.target.checked : v)))}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{t.name}</span>
                  <span className="block text-xs text-muted">
                    {formatDays(t.days)} · {TIME_LABELS[t.timeOfDay ?? "anytime"]}
                    {t.minutes ? ` · ${t.minutes} min` : ""}
                  </span>
                  {t.details && <span className="mt-1 block text-sm">{t.details}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {hasTasks && (
          <p className="text-xs text-muted">
            Saving replaces this tab&apos;s current tasks. Tasks with the same name keep their check-off history.
          </p>
        )}
        {error && <p className="text-sm text-bad">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || count === 0}
            className="flex-[2] rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : `Save ${count} ${count === 1 ? "task" : "tasks"}`}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <label htmlFor={`${area}-goals`} className="text-sm font-semibold text-muted">
        Goals
      </label>
      <textarea
        id={`${area}-goals`}
        value={goals}
        onChange={(e) => setGoals(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder={AREA_INFO[area].placeholder}
        className={input}
      />
      <div className="flex gap-2">
        <VoiceButton
          disabled={drafting}
          onError={setError}
          onText={(text) => {
            const next = goals.trim() ? `${goals.trim()} ${text}` : text;
            setGoals(next);
            plan(next);
          }}
        />
        <button
          type="button"
          onClick={() => plan()}
          disabled={drafting || !goals.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Sparkles size={16} />
          {drafting ? "Planning…" : hasTasks ? "Replan my week" : "Plan my week"}
        </button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </section>
  );
}
