"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Sparkles, X } from "lucide-react";
import { deleteSystem, generateSystem, saveSystem } from "@/app/(app)/systems/actions";
import VoiceButton from "@/components/systems/VoiceButton";
import { EVERY_DAY, TIMES_OF_DAY, TIME_LABELS, type TimeOfDay } from "@/lib/systems";

// `id` is set for steps that already exist, so saving keeps today's ticks.
type Step = { key: string; id?: string; text: string };

// Only called from event handlers, never during render.
const newSteps = (titles: string[]): Step[] => titles.map((text) => ({ key: crypto.randomUUID(), text }));

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_PRESETS = [
  { label: "Every day", days: EVERY_DAY },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [6, 7] },
];

export default function SystemForm({
  id,
  initialName = "",
  initialSteps = [],
  initialDays = EVERY_DAY,
  initialTimeOfDay = null,
}: {
  id?: string;
  initialName?: string;
  initialSteps?: { id: string; title: string }[];
  initialDays?: number[];
  initialTimeOfDay?: TimeOfDay | null;
}) {
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<Step[]>(() =>
    initialSteps.length
      ? initialSteps.map((s) => ({ key: s.id, id: s.id, text: s.title }))
      : [{ key: "initial-0", text: "" }]
  );
  const [days, setDays] = useState<number[]>(initialDays);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(initialTimeOfDay);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiPending, startAi] = useTransition();
  const [savePending, startSave] = useTransition();

  function updateStep(key: string, text: string) {
    setSteps((s) => s.map((step) => (step.key === key ? { ...step, text } : step)));
  }

  function move(index: number, by: -1 | 1) {
    setSteps((s) => {
      const target = index + by;
      if (target < 0 || target >= s.length) return s;
      const copy = [...s];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function toggleDay(day: number) {
    setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day].sort((a, b) => a - b)));
  }

  function askAi(text = prompt) {
    setAiError(null);
    startAi(async () => {
      const result = await generateSystem(text);
      if ("error" in result) {
        setAiError(result.error);
        return;
      }
      setName(result.draft.name);
      setSteps(newSteps(result.draft.steps));
    });
  }

  function save() {
    setError(null);
    startSave(async () => {
      const result = await saveSystem({
        id,
        name,
        steps: steps.map((s) => ({ id: s.id, title: s.text })),
        daysOfWeek: days,
        timeOfDay,
      });
      if (result?.error) setError(result.error);
    });
  }

  const input =
    "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-base outline-none focus:border-accent";
  const chip = (on: boolean) =>
    `rounded-full border text-sm font-medium transition-colors ${
      on ? "border-accent bg-accent text-white" : "border-border text-muted"
    }`;
  const sameDays = (a: number[], b: number[]) => a.join() === b.join();

  return (
    <div className="flex flex-col gap-6">
      {!id && (
        <section className="flex flex-col gap-2 rounded-xl bg-surface p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} className="text-accent" />
            Build it with AI
          </h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. A school system for after class: review notes, do homework, plan tomorrow"
            className={`${input} resize-none`}
          />
          <div className="flex gap-2">
            <VoiceButton
              disabled={aiPending}
              onError={setAiError}
              onText={(text) => {
                setPrompt(text);
                askAi(text);
              }}
            />
            <button
              type="button"
              onClick={() => askAi()}
              disabled={aiPending || !prompt.trim()}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {aiPending ? "Thinking…" : "Draft my system"}
            </button>
          </div>
          <p className="text-xs text-muted">
            Type or tap the mic and say it. The draft fills in the form below so you can edit it before saving.
          </p>
          {aiError && <p className="text-sm text-bad">{aiError}</p>}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <label htmlFor="system-name" className="text-sm font-semibold text-muted">
          Name
        </label>
        <input
          id="system-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Morning"
          className={input}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Days</h2>
        <div className="flex justify-between gap-1">
          {DAY_LETTERS.map((letter, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i + 1)}
              aria-pressed={days.includes(i + 1)}
              aria-label={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]}
              className={`h-10 w-10 ${chip(days.includes(i + 1))}`}
            >
              {letter}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {DAY_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDays(p.days)}
              className={`px-3 py-1 text-xs ${chip(sameDays(days, p.days))}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Time of day</h2>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
          {[...TIMES_OF_DAY, null].map((t) => (
            <button
              key={t ?? "anytime"}
              type="button"
              onClick={() => setTimeOfDay(t)}
              aria-pressed={timeOfDay === t}
              className={`rounded-lg py-2 text-xs font-medium transition-colors ${
                timeOfDay === t ? "bg-bg text-fg shadow-sm" : "text-muted"
              }`}
            >
              {TIME_LABELS[t ?? "anytime"]}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Workflow</h2>
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={step.key} className="flex items-center gap-1.5">
              <span className="w-5 shrink-0 text-right text-sm text-muted">{i + 1}</span>
              <input
                value={step.text}
                onChange={(e) => updateStep(step.key, e.target.value)}
                maxLength={200}
                placeholder="Step"
                aria-label={`Step ${i + 1}`}
                className={input}
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="p-1.5 text-muted disabled:opacity-30">
                <ArrowUp size={16} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Move down" className="p-1.5 text-muted disabled:opacity-30">
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => setSteps((s) => s.filter((x) => x.key !== step.key))}
                disabled={steps.length === 1}
                aria-label="Remove step"
                className="p-1.5 text-muted disabled:opacity-30"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setSteps((s) => [...s, ...newSteps([""])])}
          className="flex items-center gap-1.5 self-start py-1 text-sm font-medium text-accent"
        >
          <Plus size={16} />
          Add step
        </button>
      </section>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={savePending}
        className="rounded-xl bg-accent py-3 font-semibold text-white active:opacity-80 disabled:opacity-50"
      >
        {savePending ? "Saving…" : id ? "Save changes" : "Create system"}
      </button>

      {id && (
        <button
          type="button"
          onClick={() => (confirmDelete ? startSave(() => deleteSystem(id)) : setConfirmDelete(true))}
          className="pb-6 text-sm text-bad"
        >
          {confirmDelete ? "Tap again to delete this system" : "Delete system"}
        </button>
      )}
    </div>
  );
}
