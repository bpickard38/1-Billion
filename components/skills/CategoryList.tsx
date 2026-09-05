"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { computeProgressPct } from "@/lib/goals";

type Category = { id: string; name: string; sort: number; is_side_tree: boolean };
type Skill = { id: string; category_id: string; name: string; sort: number };
type Milestone = { id: string; skill_id: string; done: boolean };

function statusEmoji(done: number, total: number): string {
  if (total === 0 || done === 0) return "🔴";
  if (done === total) return "✅";
  return "🟡";
}

export default function CategoryList({
  categories,
  skills,
  milestones,
}: {
  categories: Category[];
  skills: Skill[];
  milestones: Milestone[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const skillsByCategory = useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      if (!map.has(s.category_id)) map.set(s.category_id, []);
      map.get(s.category_id)!.push(s);
    }
    return map;
  }, [skills]);

  const milestonesBySkill = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    for (const m of milestones) {
      if (!map.has(m.skill_id)) map.set(m.skill_id, []);
      map.get(m.skill_id)!.push(m);
    }
    return map;
  }, [milestones]);

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
        const catMilestones = catSkills.flatMap((s) => milestonesBySkill.get(s.id) ?? []);
        const done = catMilestones.filter((m) => m.done).length;
        const progressPct = computeProgressPct(done, catMilestones.length);
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
              <span className="shrink-0 text-xs text-muted">{progressPct}%</span>
            </button>

            {isExpanded && (
              <ul className="flex flex-col gap-1 border-t border-border p-2">
                {catSkills.length === 0 && (
                  <li className="px-2 py-1 text-xs text-muted">No skills yet.</li>
                )}
                {catSkills.map((skill) => {
                  const skillMilestones = milestonesBySkill.get(skill.id) ?? [];
                  const skillDone = skillMilestones.filter((m) => m.done).length;
                  return (
                    <li key={skill.id}>
                      <Link
                        href={`/more/skills/${skill.id}`}
                        className="flex items-center justify-between rounded px-2 py-2 text-sm"
                      >
                        <span>{skill.name}</span>
                        <span className="flex items-center gap-2 text-xs text-muted">
                          {skillDone}/{skillMilestones.length}
                          <span aria-hidden>{statusEmoji(skillDone, skillMilestones.length)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
