"use client";

import { useMemo, useTransition } from "react";
import { updateIdeaStatus } from "@/app/(app)/more/ideas/actions";

type Idea = {
  id: string;
  title: string;
  why_interesting: string | null;
  research_later: boolean;
  status: string;
  created_at: string;
};

const STATUSES = ["parked", "doing", "researched", "killed"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  parked: "Parked",
  doing: "Doing",
  researched: "Researched",
  killed: "Killed",
};

export default function IdeasList({ ideas }: { ideas: Idea[] }) {
  const [isPending, startTransition] = useTransition();

  const byStatus = useMemo(() => {
    const map = new Map<string, Idea[]>();
    for (const status of STATUSES) map.set(status, []);
    for (const idea of ideas) map.get(idea.status)?.push(idea);
    return map;
  }, [ideas]);

  return (
    <div className="flex flex-col gap-6">
      {STATUSES.map((status) => {
        const group = byStatus.get(status) ?? [];
        if (group.length === 0) return null;
        return (
          <section key={status} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted">
              {STATUS_LABEL[status]} ({group.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {group.map((idea) => (
                <li key={idea.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{idea.title}</span>
                      {idea.why_interesting && (
                        <span className="text-xs text-muted">{idea.why_interesting}</span>
                      )}
                      {idea.research_later && (
                        <span className="mt-1 w-fit rounded bg-border px-1.5 py-0.5 text-[10px] text-muted">
                          Research later
                        </span>
                      )}
                    </div>
                    <select
                      value={idea.status}
                      disabled={isPending}
                      onChange={(e) =>
                        startTransition(async () => {
                          await updateIdeaStatus(idea.id, e.target.value);
                        })
                      }
                      className="shrink-0 rounded border border-border bg-transparent p-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {ideas.length === 0 && <p className="text-sm text-muted">No ideas yet.</p>}
    </div>
  );
}
