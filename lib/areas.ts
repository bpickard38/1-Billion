import type { TimeOfDay } from "@/lib/systems";

// The Content and Code tabs. Each has goals, an AI weekly plan, and the
// tasks that plan creates (systems with kind = 'task' and this area).

export const AREAS = ["content", "code"] as const;
export type Area = (typeof AREAS)[number];

export const AREA_INFO: Record<Area, { label: string; intro: string; placeholder: string }> = {
  content: {
    label: "Content",
    intro: "Say what you make, where you post and how often. AI turns it into a weekly content schedule.",
    placeholder:
      "e.g. 3 short videos a week on TikTok and YouTube Shorts about my training and game dev. I can film on weekends.",
  },
  code: {
    label: "Code",
    intro: "Say what you're learning and building. AI plans learning time and how to apply it to your game each week.",
    placeholder:
      "e.g. Learn a new coding skill 60 min a day, then 60 min on weekdays applying it to my game. Using Godot.",
  },
};

export function isArea(value: unknown): value is Area {
  return (AREAS as readonly unknown[]).includes(value);
}

export type PlannedTask = {
  name: string;
  minutes: number | null;
  days: number[];
  timeOfDay: TimeOfDay | null;
  details: string;
};

/**
 * Match a new weekly plan against the area's existing tasks by name
 * (case-insensitive): matching ones are updated in place (history kept),
 * new names inserted, and tasks missing from the plan deleted.
 */
export function diffPlan(
  existing: readonly { id: string; name: string }[],
  planned: readonly PlannedTask[]
): { update: { id: string; task: PlannedTask }[]; insert: PlannedTask[]; remove: string[] } {
  const byName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e.id]));
  const kept = new Set<string>();
  const update: { id: string; task: PlannedTask }[] = [];
  const insert: PlannedTask[] = [];
  for (const task of planned) {
    const id = byName.get(task.name.trim().toLowerCase());
    if (id && !kept.has(id)) {
      kept.add(id);
      update.push({ id, task });
    } else {
      insert.push(task);
    }
  }
  return { update, insert, remove: existing.filter((e) => !kept.has(e.id)).map((e) => e.id) };
}
