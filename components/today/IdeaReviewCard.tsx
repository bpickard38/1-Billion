"use client";

import { useState, useTransition } from "react";
import { reviewIdea, type IdeaToReview } from "@/app/(app)/more/ideas/actions";

const ACTIONS = [
  { status: "parked", label: "Keep parked" },
  { status: "doing", label: "Start doing" },
  { status: "researched", label: "Researched" },
  { status: "killed", label: "Kill" },
] as const;

export default function IdeaReviewCard({ ideas }: { ideas: IdeaToReview[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [remaining, setRemaining] = useState(ideas);
  const [isPending, startTransition] = useTransition();

  if (ideas.length === 0) return null;

  const current = remaining[0];

  function decide(status: string) {
    if (!current) return;
    startTransition(async () => {
      await reviewIdea(current.id, status);
      setRemaining((prev) => prev.slice(1));
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-border px-3 py-2 text-sm text-accent"
      >
        Review {ideas.length} parked idea{ideas.length === 1 ? "" : "s"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Monthly idea review</h2>
              <button type="button" onClick={() => setIsOpen(false)} className="text-sm text-muted">
                Close
              </button>
            </div>

            {current ? (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-xs text-muted">{remaining.length} left</p>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{current.title}</p>
                  {current.why_interesting && (
                    <p className="mt-1 text-xs text-muted">{current.why_interesting}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.status}
                      type="button"
                      disabled={isPending}
                      onClick={() => decide(a.status)}
                      className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">All reviewed for this month.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
