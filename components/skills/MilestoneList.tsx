"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import MilestoneEditor, { type Milestone } from "./MilestoneEditor";

export default function MilestoneList({
  skillId,
  milestones,
}: {
  skillId: string;
  milestones: Milestone[];
}) {
  const [editing, setEditing] = useState<Milestone | "new" | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {milestones.length === 0 && <p className="text-sm text-muted">No milestones yet.</p>}

      <ul className="flex flex-col gap-1">
        {milestones.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setEditing(m)}
              className="flex w-full items-start gap-2 rounded-lg border border-border p-3 text-left"
            >
              <span className="mt-0.5 shrink-0">{m.done ? "✅" : "⬜️"}</span>
              <span className="flex flex-col">
                <span className={`text-sm ${m.done ? "text-fg" : "text-muted"}`}>{m.title}</span>
                {m.done && m.proof && <span className="text-xs text-muted">Proof: {m.proof}</span>}
              </span>
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
        Add milestone
      </button>

      {editing && (
        <MilestoneEditor
          skillId={skillId}
          milestone={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
