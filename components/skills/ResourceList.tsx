"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import ResourceEditor, { type Resource } from "./ResourceEditor";

export default function ResourceList({
  skillId,
  resources,
}: {
  skillId: string;
  resources: Resource[];
}) {
  const [editing, setEditing] = useState<Resource | "new" | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {resources.length === 0 && <p className="text-sm text-muted">No resources yet.</p>}

      <ul className="flex flex-col gap-1">
        {resources.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setEditing(r)}
              className="flex w-full flex-col gap-0.5 rounded-lg border border-border p-3 text-left"
            >
              <span className="text-[10px] uppercase tracking-wide text-muted">{r.kind}</span>
              <span className="text-sm">{r.title}</span>
              {r.how_to_use && <span className="text-xs text-muted">{r.how_to_use}</span>}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setEditing("new")}
        className="flex items-center justify-center gap-1 self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted"
      >
        <Plus size={14} />
        Add resource
      </button>

      {editing && (
        <ResourceEditor
          skillId={skillId}
          resource={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
