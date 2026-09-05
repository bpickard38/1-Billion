"use client";

import { useState, useTransition } from "react";
import { upsertMilestone } from "@/app/(app)/more/skills/actions";

export type Milestone = {
  id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  proof: string | null;
};

export default function MilestoneEditor({
  skillId,
  milestone,
  onClose,
}: {
  skillId: string;
  milestone?: Milestone;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [done, setDone] = useState(milestone?.done ?? false);
  const [proof, setProof] = useState(milestone?.proof ?? "");
  const [isPending, startTransition] = useTransition();

  const proofRequired = done && !proof.trim();
  const canSave = title.trim() && !proofRequired;

  function save() {
    if (!canSave) return;
    startTransition(async () => {
      await upsertMilestone({
        id: milestone?.id,
        skillId,
        title: title.trim(),
        done,
        proof: done ? proof.trim() : null,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{milestone ? "Edit milestone" : "Add milestone"}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
            Proven
          </label>

          {done && (
            <label className="flex flex-col gap-1 text-sm">
              Proof (what/when)
              <input
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder="e.g. Made 100 cold calls, week of Sep 1"
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
              {proofRequired && <span className="text-xs text-bad">Proof is required to check this off.</span>}
            </label>
          )}

          <button
            type="button"
            onClick={save}
            disabled={isPending || !canSave}
            className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
