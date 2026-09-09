import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export const GOAL_LEVELS = ["dream", "month", "week", "today"] as const;

export type GoalLevel = (typeof GOAL_LEVELS)[number];

export const LEVEL_LABEL: Record<GoalLevel, string> = {
  dream: "Dream",
  month: "Month",
  week: "Week",
  today: "Today",
};

/** The level a goal at `level` must have its parent in, or null for "dream" (no parent). */
export function parentLevelOf(level: string): GoalLevel | null {
  const index = GOAL_LEVELS.indexOf(level as GoalLevel);
  if (index <= 0) return null;
  return GOAL_LEVELS[index - 1];
}

export type ChainLink = { id: string; title: string; level: string };

const MAX_CHAIN_HOPS = 10; // goal levels are 4 deep max; this is just a safety cap

/**
 * Walks `parent_id` up to the Dream, one query per hop. Goal levels are
 * shallow (4 max) so this naive walk is plenty fast — no recursive CTE
 * needed at this depth.
 */
export async function getGoalChain(
  supabase: SupabaseClient<Database>,
  goalId: string | null
): Promise<ChainLink[]> {
  const chain: ChainLink[] = [];
  let currentId = goalId;
  let hops = 0;
  while (currentId && hops < MAX_CHAIN_HOPS) {
    const { data } = await supabase
      .from("goals")
      .select("id, title, level, parent_id")
      .eq("id", currentId)
      .maybeSingle();
    if (!data) break;
    chain.push({ id: data.id, title: data.title, level: data.level });
    currentId = data.parent_id;
    hops++;
  }
  return chain;
}

type GoalNodeLike = { id: string; title: string; level: string; parent_id: string | null };

/** Same walk as `getGoalChain`, but over an already-loaded in-memory map (no DB round trips) — used by the Goals tree, which loads every goal up front. */
export function buildChainFromMap(
  goalsById: ReadonlyMap<string, GoalNodeLike>,
  goalId: string | null
): ChainLink[] {
  const chain: ChainLink[] = [];
  let currentId = goalId;
  let hops = 0;
  while (currentId && hops < MAX_CHAIN_HOPS) {
    const goal = goalsById.get(currentId);
    if (!goal) break;
    chain.push({ id: goal.id, title: goal.title, level: goal.level });
    currentId = goal.parent_id;
    hops++;
  }
  return chain;
}

/** % of child goals completed. 0 when there are no children, never NaN/Infinity. */
export function computeProgressPct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}
