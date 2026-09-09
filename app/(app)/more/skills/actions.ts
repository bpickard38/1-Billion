"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SkillStatus = "not_started" | "in_progress" | "proven";

export async function updateSkillStatus(skillId: string, status: SkillStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("skills").update({ status }).eq("id", skillId);
  if (error) throw new Error(error.message);
  refresh();
}
