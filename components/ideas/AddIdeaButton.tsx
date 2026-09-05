"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addIdea } from "@/app/(app)/more/ideas/actions";

export default function AddIdeaButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [whyInteresting, setWhyInteresting] = useState("");
  const [researchLater, setResearchLater] = useState(false);
  const [isPending, startTransition] = useTransition();

  function close() {
    setIsOpen(false);
    setTitle("");
    setWhyInteresting("");
    setResearchLater(false);
  }

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await addIdea({
        title: title.trim(),
        whyInteresting: whyInteresting.trim() || null,
        researchLater,
      });
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Add idea"
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-bg shadow-lg"
      >
        <Plus size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New idea</h2>
              <button type="button" onClick={close} className="text-sm text-muted">
                Close
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Idea
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  className="rounded border border-border bg-transparent p-2 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Why interesting
                <textarea
                  value={whyInteresting}
                  onChange={(e) => setWhyInteresting(e.target.value)}
                  rows={2}
                  className="rounded border border-border bg-transparent p-2 text-sm"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={researchLater}
                  onChange={(e) => setResearchLater(e.target.checked)}
                />
                Research later
              </label>

              <button
                type="button"
                onClick={save}
                disabled={isPending || !title.trim()}
                className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Add idea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
