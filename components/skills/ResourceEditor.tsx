"use client";

import { useState, useTransition } from "react";
import { upsertResource } from "@/app/(app)/more/skills/actions";

export type Resource = {
  id: string;
  kind: string;
  title: string;
  url: string | null;
  how_to_use: string | null;
};

const KIND_OPTIONS = ["book", "podcast", "doc", "course", "person", "project"];

export default function ResourceEditor({
  skillId,
  resource,
  onClose,
}: {
  skillId: string;
  resource?: Resource;
  onClose: () => void;
}) {
  const [kind, setKind] = useState(resource?.kind ?? KIND_OPTIONS[0]);
  const [title, setTitle] = useState(resource?.title ?? "");
  const [url, setUrl] = useState(resource?.url ?? "");
  const [howToUse, setHowToUse] = useState(resource?.how_to_use ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await upsertResource({
        id: resource?.id,
        skillId,
        kind,
        title: title.trim(),
        url: url.trim() || null,
        howToUse: howToUse.trim() || null,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{resource ? "Edit resource" : "Add resource"}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Kind
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

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
            Link
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            How to use it
            <textarea
              value={howToUse}
              onChange={(e) => setHowToUse(e.target.value)}
              rows={2}
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
