"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { updateSkillStatus, type SkillStatus } from "@/app/(app)/more/skills/actions";

type Category = { id: string; name: string; sort: number; is_side_tree: boolean };
type Skill = { id: string; category_id: string; name: string; sort: number; status: SkillStatus };

const STATUS_LABEL: Record<SkillStatus, string> = {
  not_started: "🔴 Not started",
  in_progress: "🟡 In progress",
  proven: "✅ Proven",
};

export default function CategoryList({
  categories,
  skills,
}: {
  categories: Category[];
  skills: Skill[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const skillsByCategory = useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      if (!map.has(s.category_id)) map.set(s.category_id, []);
      map.get(s.category_id)!.push(s);
    }
    return map;
  }, [skills]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {categories.map((cat) => {
        const catSkills = skillsByCategory.get(cat.id) ?? [];
        const proven = catSkills.filter((s) => s.status === "proven").length;
        const isExpanded = expanded.has(cat.id);

        return (
          <li key={cat.id} className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => toggle(cat.id)}
              className="flex w-full items-center gap-2 p-3 text-left"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="shrink-0 text-muted" />
              ) : (
                <ChevronRight size={16} className="shrink-0 text-muted" />
              )}
              <span className="flex-1 text-sm font-medium">
                {cat.name}
                {cat.is_side_tree && <span className="ml-1 text-xs text-muted">(side)</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {proven}/{catSkills.length}
              </span>
            </button>

            {isExpanded && (
              <ul className="flex flex-col gap-1 border-t border-border p-2">
                {catSkills.length === 0 && (
                  <li className="px-2 py-1 text-xs text-muted">No skills yet.</li>
                )}
                {catSkills.map((skill) => (
                  <li
                    key={skill.id}
                    className="flex items-center justify-between gap-2 rounded px-2 py-2 text-sm"
                  >
                    <span>{skill.name}</span>
                    <select
                      value={skill.status}
                      disabled={isPending}
                      onChange={(e) =>
                        startTransition(() =>
                          updateSkillStatus(skill.id, e.target.value as SkillStatus)
                        )
                      }
                      className="rounded border border-border bg-bg px-2 py-1 text-xs"
                    >
                      {(Object.keys(STATUS_LABEL) as SkillStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
