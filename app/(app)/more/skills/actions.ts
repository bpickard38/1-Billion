"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MilestoneInput = {
  id?: string;
  skillId: string;
  title: string;
  done: boolean;
  proof: string | null;
};

export async function upsertMilestone(input: MilestoneInput) {
  const supabase = await createClient();

  let doneAt: string | null = input.done ? new Date().toISOString() : null;
  if (input.id && input.done) {
    const { data: existing } = await supabase
      .from("skill_milestones")
      .select("done, done_at")
      .eq("id", input.id)
      .maybeSingle();
    if (existing?.done && existing.done_at) doneAt = existing.done_at;
  }

  const row = {
    skill_id: input.skillId,
    title: input.title,
    done: input.done,
    done_at: doneAt,
    proof: input.done ? input.proof : null,
  };

  if (input.id) {
    const { error } = await supabase.from("skill_milestones").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("skill_milestones").insert(row);
    if (error) throw new Error(error.message);
  }

  refresh();
}

export type ResourceInput = {
  id?: string;
  skillId: string;
  kind: string;
  title: string;
  url: string | null;
  howToUse: string | null;
};

export async function upsertResource(input: ResourceInput) {
  const supabase = await createClient();
  const row = {
    skill_id: input.skillId,
    kind: input.kind,
    title: input.title,
    url: input.url,
    how_to_use: input.howToUse,
  };

  if (input.id) {
    const { error } = await supabase.from("skill_resources").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("skill_resources").insert(row);
    if (error) throw new Error(error.message);
  }

  refresh();
}
