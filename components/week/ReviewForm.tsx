"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveReviewDraft, submitReview, type ReviewAnswers } from "@/app/(app)/week/actions";

const FIELDS: { key: keyof ReviewAnswers; label: string }[] = [
  { key: "accomplished", label: "What did I accomplish?" },
  { key: "failed", label: "What did I fail at?" },
  { key: "why", label: "Why?" },
  { key: "customerInsight", label: "What did customers teach me?" },
  { key: "wastedTimeOn", label: "What did I waste time on?" },
  { key: "bottleneck", label: "Biggest bottleneck?" },
  { key: "nextWeekTop3", label: "Next week's top 3 (one per line)" },
];

const DRAFT_SAVE_DELAY_MS = 800;

export default function ReviewForm({
  weekStart,
  initialAnswers,
}: {
  weekStart: string;
  initialAnswers: ReviewAnswers;
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        await saveReviewDraft(weekStart, answers);
      });
    }, DRAFT_SAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, weekStart]);

  function setField(key: keyof ReviewAnswers, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      await submitReview(weekStart, answers);
      // The Week tab is gone (nav rework) — Today is where the streak/score
      // now lives (WeekStreakCard), so that's the natural landing spot.
      router.push("/today");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {FIELDS.map(({ key, label }) => (
        <label key={key} className="flex flex-col gap-1 text-sm">
          {label}
          <textarea
            value={answers[key]}
            onChange={(e) => setField(key, e.target.value)}
            rows={key === "nextWeekTop3" ? 3 : 2}
            className="rounded border border-border bg-transparent p-2 text-sm"
          />
        </label>
      ))}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Submit and close the week"}
      </button>
    </div>
  );
}
