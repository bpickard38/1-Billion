"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { draftSystem, type SystemDraft } from "@/lib/systems-ai";
import { isTimeOfDay, type TimeOfDay } from "@/lib/systems";
import { uniqueSlug } from "@/lib/slug";

const MAX_STEPS = 30;

async function todayString() {
  const profile = await getProfile();
  return getLocalDateString(new Date(), profile?.timezone ?? DEFAULT_TIMEZONE);
}

/**
 * Check (or uncheck) a whole system for a day (today by default, or a past
 * day tapped on the calendar). Checking ticks every step too; unchecking
 * clears that day's ticks, so the two stay in sync.
 */
export async function setSystemDone(systemId: string, done: boolean, day?: string) {
  const supabase = await createClient();
  const today = await todayString();
  const date = day ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) throw new Error("You can only log today or past days.");

  if (done) {
    const { data: steps } = await supabase.from("system_steps").select("id").eq("system_id", systemId);
    const [{ error }, { error: stepError }] = await Promise.all([
      supabase
        .from("system_logs")
        .upsert({ system_id: systemId, date }, { onConflict: "system_id,date", ignoreDuplicates: true }),
      supabase.from("step_logs").upsert(
        (steps ?? []).map((s) => ({ step_id: s.id, system_id: systemId, date })),
        { onConflict: "step_id,date", ignoreDuplicates: true }
      ),
    ]);
    if (error || stepError) throw new Error((error ?? stepError)!.message);
  } else {
    const [{ error }, { error: stepError }] = await Promise.all([
      supabase.from("system_logs").delete().eq("system_id", systemId).eq("date", date),
      supabase.from("step_logs").delete().eq("system_id", systemId).eq("date", date),
    ]);
    if (error || stepError) throw new Error((error ?? stepError)!.message);
  }

  // Clear the client cache too, so going back to the home calendar (e.g.
  // swiping back on iPhone) shows the change instead of a cached page.
  revalidatePath("/systems", "layout");
  refresh();
}

/**
 * Tick (or untick) one step for today. The system is checked off once every
 * step is ticked, and unchecked again if one is unticked.
 */
export async function setStepDone(systemId: string, stepId: string, done: boolean) {
  const supabase = await createClient();
  const date = await todayString();

  const { error } = done
    ? await supabase
        .from("step_logs")
        .upsert({ step_id: stepId, system_id: systemId, date }, { onConflict: "step_id,date", ignoreDuplicates: true })
    : await supabase.from("step_logs").delete().eq("step_id", stepId).eq("date", date);
  if (error) throw new Error(error.message);

  const [{ count: stepCount }, { count: tickedCount }] = await Promise.all([
    supabase.from("system_steps").select("id", { count: "exact", head: true }).eq("system_id", systemId),
    supabase.from("step_logs").select("id", { count: "exact", head: true }).eq("system_id", systemId).eq("date", date),
  ]);
  const allDone = (stepCount ?? 0) > 0 && (tickedCount ?? 0) >= (stepCount ?? 0);

  const { error: systemError } = allDone
    ? await supabase
        .from("system_logs")
        .upsert({ system_id: systemId, date }, { onConflict: "system_id,date", ignoreDuplicates: true })
    : await supabase.from("system_logs").delete().eq("system_id", systemId).eq("date", date);
  if (systemError) throw new Error(systemError.message);

  // Clear the client cache too, so going back to the home calendar (e.g.
  // swiping back on iPhone) shows the change instead of a cached page.
  revalidatePath("/systems", "layout");
  refresh();
}

/** Save a new order for all systems: `ids` top to bottom. */
export async function setSystemOrder(ids: string[]) {
  const supabase = await createClient();
  const results = await Promise.all(
    ids.map((id, i) => supabase.from("systems").update({ sort: i + 1 }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  refresh();
}

export type SystemInput = {
  id?: string;
  name: string;
  steps: { id?: string; title: string }[];
  daysOfWeek: number[];
  timeOfDay: TimeOfDay | null;
};

/**
 * Create or update a system and its steps. Returns an error message for the
 * form to show, or redirects to the system on success.
 */
export async function saveSystem(input: SystemInput): Promise<{ error: string }> {
  const name = input.name.trim().slice(0, 80);
  const steps = input.steps
    .map((s) => ({ id: s.id, title: s.title.trim().slice(0, 200) }))
    .filter((s) => s.title)
    .slice(0, MAX_STEPS);
  if (!name) return { error: "Give the system a name." };
  if (steps.length === 0) return { error: "Add at least one step." };
  const days_of_week = [...new Set(input.daysOfWeek)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (days_of_week.length === 0) return { error: "Pick at least one day." };
  const time_of_day = isTimeOfDay(input.timeOfDay) ? input.timeOfDay : null;

  const supabase = await createClient();
  let systemId = input.id;

  const { data: others } = await supabase.from("systems").select("id, slug");
  const slug = uniqueSlug(name, new Set((others ?? []).filter((o) => o.id !== systemId).map((o) => o.slug)));

  if (systemId) {
    const { error } = await supabase.from("systems").update({ name, slug, days_of_week, time_of_day }).eq("id", systemId);
    if (error) return { error: error.code === "23505" ? "You already have a system with that name." : error.message };
  } else {
    const { data: last } = await supabase
      .from("systems")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("systems")
      .insert({ name, slug, days_of_week, time_of_day, sort: (last?.sort ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { error: error.code === "23505" ? "You already have a system with that name." : error.message };
    systemId = data.id;
  }

  // Sync the steps: update kept ones in place (so today's ticks survive an
  // edit), insert new ones, then delete removed ones last so a failure part
  // way never leaves the system empty.
  const { data: oldSteps } = await supabase.from("system_steps").select("id").eq("system_id", systemId);
  const oldIds = new Set((oldSteps ?? []).map((s) => s.id));
  const kept = steps.map((step, i) => ({ ...step, sort: i + 1 })).filter((s) => s.id && oldIds.has(s.id));
  const added = steps.map((step, i) => ({ ...step, sort: i + 1 })).filter((s) => !s.id || !oldIds.has(s.id));

  const results = await Promise.all([
    ...kept.map((s) => supabase.from("system_steps").update({ title: s.title, sort: s.sort }).eq("id", s.id!)),
    added.length > 0
      ? supabase.from("system_steps").insert(added.map((s) => ({ system_id: systemId!, title: s.title, sort: s.sort })))
      : Promise.resolve({ error: null }),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  const keptIds = new Set(kept.map((s) => s.id));
  const removed = [...oldIds].filter((id) => !keptIds.has(id));
  if (removed.length > 0) {
    const { error } = await supabase.from("system_steps").delete().in("id", removed);
    if (error) return { error: error.message };
  }

  redirect(`/systems/${slug}`);
}

export async function deleteSystem(systemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("systems").delete().eq("id", systemId);
  if (error) throw new Error(error.message);
  redirect("/systems");
}

/** Ask the AI to turn a plain-language description into a draft system. */
export async function generateSystem(
  description: string
): Promise<{ draft: SystemDraft } | { error: string }> {
  const text = description.trim().slice(0, 2000);
  if (!text) return { error: "Describe the system you want first." };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("claim_ai");
  if (!allowed) return { error: "Give it a few seconds before asking the AI again." };

  try {
    return { draft: await draftSystem(text) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The AI request failed." };
  }
}
