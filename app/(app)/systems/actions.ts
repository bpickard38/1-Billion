"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { draftSystem, type SystemDraft } from "@/lib/systems-ai";

const MAX_STEPS = 30;

async function todayString() {
  const profile = await getProfile();
  return getLocalDateString(new Date(), profile?.timezone ?? DEFAULT_TIMEZONE);
}

/** Check (or uncheck) a system for today. */
export async function setSystemDone(systemId: string, done: boolean) {
  const supabase = await createClient();
  const date = await todayString();

  const { error } = done
    ? await supabase
        .from("system_logs")
        .upsert({ system_id: systemId, date }, { onConflict: "system_id,date", ignoreDuplicates: true })
    : await supabase.from("system_logs").delete().eq("system_id", systemId).eq("date", date);
  if (error) throw new Error(error.message);

  refresh();
}

export type SystemInput = { id?: string; name: string; steps: string[] };

/**
 * Create or update a system and its steps. Returns an error message for the
 * form to show, or redirects to the system on success.
 */
export async function saveSystem(input: SystemInput): Promise<{ error: string }> {
  const name = input.name.trim().slice(0, 80);
  const steps = input.steps.map((s) => s.trim().slice(0, 200)).filter(Boolean).slice(0, MAX_STEPS);
  if (!name) return { error: "Give the system a name." };
  if (steps.length === 0) return { error: "Add at least one step." };

  const supabase = await createClient();
  let systemId = input.id;

  if (systemId) {
    const { error } = await supabase.from("systems").update({ name }).eq("id", systemId);
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
      .insert({ name, sort: (last?.sort ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { error: error.code === "23505" ? "You already have a system with that name." : error.message };
    systemId = data.id;
  }

  // Replace the steps: insert the new list first, then remove the old rows,
  // so a failed insert never leaves the system empty.
  const { data: oldSteps } = await supabase.from("system_steps").select("id").eq("system_id", systemId);
  const { error: insertError } = await supabase
    .from("system_steps")
    .insert(steps.map((title, i) => ({ system_id: systemId!, title, sort: i + 1 })));
  if (insertError) return { error: insertError.message };

  const oldIds = (oldSteps ?? []).map((s) => s.id);
  if (oldIds.length > 0) {
    const { error } = await supabase.from("system_steps").delete().in("id", oldIds);
    if (error) return { error: error.message };
  }

  redirect(`/systems/${systemId}`);
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
