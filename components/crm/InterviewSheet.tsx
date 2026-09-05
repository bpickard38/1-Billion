"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { logInterview } from "@/app/(app)/crm/actions";
import type { ProblemOption } from "./ContactList";

const NEW_PROBLEM = "__new__";

type TagRow = {
  key: string;
  problemId: string;
  newTitle: string;
  painScore: string;
  quote: string;
};

function newTagRow(): TagRow {
  return { key: crypto.randomUUID(), problemId: "", newTitle: "", painScore: "", quote: "" };
}

export default function InterviewSheet({
  contactId,
  problems,
  today,
  onClose,
}: {
  contactId: string;
  problems: ProblemOption[];
  today: string;
  onClose: () => void;
}) {
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [currentSolution, setCurrentSolution] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [painScore, setPainScore] = useState("");
  const [wouldPilot, setWouldPilot] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpOn, setFollowUpOn] = useState("");
  const [tags, setTags] = useState<TagRow[]>([]);
  const [isPending, startTransition] = useTransition();

  function updateTag(key: string, patch: Partial<TagRow>) {
    setTags((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function save() {
    startTransition(async () => {
      await logInterview({
        contactId,
        date,
        notes: notes.trim() || null,
        currentSolution: currentSolution.trim() || null,
        estimatedCost: estimatedCost.trim() ? Number(estimatedCost) : null,
        painScore: painScore.trim() ? Number(painScore) : null,
        wouldPilot: wouldPilot || null,
        followUp: followUp.trim() || null,
        followUpOn: followUpOn || null,
        problemTags: tags
          .filter((t) => t.problemId || t.newTitle.trim())
          .map((t) => ({
            problemId: t.problemId === NEW_PROBLEM || !t.problemId ? undefined : t.problemId,
            newTitle: t.problemId === NEW_PROBLEM || !t.problemId ? t.newTitle.trim() : undefined,
            painScore: t.painScore.trim() ? Number(t.painScore) : null,
            quote: t.quote.trim() || null,
          })),
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Log interview</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Current solution
            <input
              value={currentSolution}
              onChange={(e) => setCurrentSolution(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Estimated cost of problem
              <input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Pain score (1-10)
              <input
                type="number"
                min={1}
                max={10}
                value={painScore}
                onChange={(e) => setPainScore(e.target.value)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Would pilot?
            <select
              value={wouldPilot}
              onChange={(e) => setWouldPilot(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            >
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Follow-up action
            <input
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Follow-up date
            <input
              type="date"
              value={followUpOn}
              onChange={(e) => setFollowUpOn(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Problems mentioned</p>
            {tags.map((tag) => (
              <div key={tag.key} className="flex flex-col gap-2 rounded border border-border p-2">
                <div className="flex gap-2">
                  <select
                    value={tag.problemId}
                    onChange={(e) => updateTag(tag.key, { problemId: e.target.value })}
                    className="flex-1 rounded border border-border bg-transparent p-2 text-sm"
                  >
                    <option value="">Choose a problem</option>
                    {problems.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                    <option value={NEW_PROBLEM}>+ New problem...</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t.key !== tag.key))}
                    className="shrink-0 text-muted"
                    aria-label="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
                {tag.problemId === NEW_PROBLEM && (
                  <input
                    value={tag.newTitle}
                    onChange={(e) => updateTag(tag.key, { newTitle: e.target.value })}
                    placeholder="New problem title"
                    className="rounded border border-border bg-transparent p-2 text-sm"
                  />
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tag.painScore}
                    onChange={(e) => updateTag(tag.key, { painScore: e.target.value })}
                    placeholder="Pain score"
                    className="w-24 rounded border border-border bg-transparent p-2 text-sm"
                  />
                  <input
                    value={tag.quote}
                    onChange={(e) => updateTag(tag.key, { quote: e.target.value })}
                    placeholder="Quote (optional)"
                    className="flex-1 rounded border border-border bg-transparent p-2 text-sm"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTags((prev) => [...prev, newTagRow()])}
              className="flex items-center justify-center gap-1 self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted"
            >
              <Plus size={14} />
              Tag problem
            </button>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save interview"}
          </button>
        </div>
      </div>
    </div>
  );
}
