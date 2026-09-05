"use client";

import { startTransition, useActionState, useState } from "react";
import { submitDailyReview } from "@/app/(app)/today/actions";

type HoursMetric = { id: string; name: string };

export default function DailyReviewSheet({
  hoursMetrics,
  alreadySubmitted,
}: {
  hoursMetrics: HoursMetric[];
  alreadySubmitted: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const [{ key }, formAction, isPending] = useActionState(
    async (prev: { key: number }, formData: FormData) => {
      const accomplished = String(formData.get("accomplished") ?? "");
      const learned = String(formData.get("learned") ?? "");
      const tomorrowPriority = String(formData.get("tomorrowPriority") ?? "");
      const hours = hoursMetrics.map((metric) => ({
        metricId: metric.id,
        value: Number(formData.get(`hours-${metric.id}`)) || 0,
      }));

      await submitDailyReview({ accomplished, learned, tomorrowPriority, hours });

      startTransition(() => setIsOpen(false));
      return { key: prev.key + 1 };
    },
    { key: 0 }
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${
          alreadySubmitted ? "border-good/40 text-good" : "border-accent/60 text-accent"
        }`}
      >
        {alreadySubmitted ? "Daily review ✓ (edit)" : "Daily review"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Daily review</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-sm text-muted"
              >
                Close
              </button>
            </div>

            <form key={key} action={formAction} className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                What did I accomplish?
                <textarea
                  name="accomplished"
                  rows={2}
                  className="rounded border border-border bg-transparent p-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                What did I learn?
                <textarea
                  name="learned"
                  rows={2}
                  className="rounded border border-border bg-transparent p-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Tomorrow&apos;s #1 task
                <input
                  name="tomorrowPriority"
                  className="rounded border border-border bg-transparent p-2 text-sm"
                />
              </label>

              {hoursMetrics.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  {hoursMetrics.map((metric) => (
                    <label key={metric.id} className="flex items-center justify-between text-sm">
                      {metric.name}
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        name={`hours-${metric.id}`}
                        className="w-20 rounded border border-border bg-transparent px-2 py-1 text-right text-sm"
                      />
                    </label>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Submit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
