"use server";

import { refresh, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { planArea } from "@/lib/area-ai";
import { diffPlan, isArea, type Area, type PlannedTask } from "@/lib/areas";
import { isTimeOfDay } from "@/lib/systems";
import { uniqueSlug } from "@/lib/slug";

/** Ask the AI for a week of tasks. Saves the goals; the tasks are only a preview until saveAreaPlan. */
export async function draftAreaPlan(
  area: Area,
  goalsInput: string
): Promise<{ error: string } | { summary: string; tasks: PlannedTask[] }> {
  if (!isArea(area)) return { error: "Unknown tab." };
  const goals = goalsInput.trim().slice(0, 2000);
  if (!goals) return { error: "Write your goals first." };

  const supabase = await createClient();
  await supabase.from("area_plans").upsert({ area, goals }, { onConflict: "user_id,area" });
  const { data: allowed } = await supabase.rpc("claim_ai");
  if (!allowed) return { error: "Give it a few seconds before asking the AI again." };

  try {
    return await planArea(area, goals);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The AI request failed." };
  }
}

function cleanTask(t: PlannedTask): PlannedTask | null {
  const name = t.name.trim().slice(0, 80);
  const days = [...new Set(t.days)].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort((a, b) => a - b);
  if (!name || days.length === 0) return null;
  const minutes = typeof t.minutes === "number" && t.minutes >= 1 && t.minutes <= 600 ? Math.round(t.minutes) : null;
  return {
    name,
    days,
    minutes,
    timeOfDay: isTimeOfDay(t.timeOfDay) ? t.timeOfDay : null,
    details: t.details.trim().slice(0, 1000),
  };
}

/**
 * Save the tasks you kept from a draft. Same-named tasks are updated (their
 * history stays), new ones are added, and this tab's other tasks are removed.
 */
export async function saveAreaPlan(area: Area, summary: string, tasks: PlannedTask[]): Promise<{ error: string } | { ok: true }> {
  if (!isArea(area)) return { error: "Unknown tab." };
  const planned = tasks.map(cleanTask).filter((t): t is PlannedTask => t !== null).slice(0, 15);
  if (planned.length === 0) return { error: "Keep at least one task." };

  const supabase = await createClient();
  const { data: all } = await supabase.from("systems").select("id, name, slug, area, sort");
  const existing = (all ?? []).filter((s) => s.area === area);
  const { update, insert, remove } = diffPlan(existing, planned);

  const taken = new Set((all ?? []).filter((s) => !remove.includes(s.id)).map((s) => s.slug));
  const fields = (t: PlannedTask) => ({
    name: t.name,
    kind: "task",
    area,
    minutes: t.minutes,
    details: t.details || null,
    days_of_week: t.days,
    time_of_day: t.timeOfDay,
  });

  if (remove.length > 0) {
    const { error } = await supabase.from("systems").delete().in("id", remove);
    if (error) return { error: error.message };
  }

  for (const { id, task } of update) {
    const own = existing.find((e) => e.id === id)!;
    taken.delete(own.slug);
    const slug = uniqueSlug(task.name, taken);
    taken.add(slug);
    const { error } = await supabase.from("systems").update({ ...fields(task), slug }).eq("id", id);
    if (error) return { error: error.code === "23505" ? `You already have something called "${task.name}".` : error.message };
  }

  let sort = Math.max(0, ...(all ?? []).map((s) => s.sort));
  for (const task of insert) {
    const slug = uniqueSlug(task.name, taken);
    taken.add(slug);
    const { error } = await supabase.from("systems").insert({ ...fields(task), slug, sort: ++sort });
    if (error) return { error: error.code === "23505" ? `You already have something called "${task.name}".` : error.message };
  }

  await supabase.from("area_plans").upsert({ area, summary: summary.trim().slice(0, 1000) }, { onConflict: "user_id,area" });

  revalidatePath("/", "layout");
  refresh();
  return { ok: true };
}
