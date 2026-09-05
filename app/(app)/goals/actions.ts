"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type GoalInput = {
  id?: string;
  level: string;
  parentId: string | null;
  title: string;
  targetValue: number | null;
  targetUnit: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
};

export async function upsertGoal(input: GoalInput) {
  const supabase = await createClient();
  const row = {
    level: input.level,
    parent_id: input.parentId,
    title: input.title,
    target_value: input.targetValue,
    target_unit: input.targetUnit,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    status: input.status,
  };

  if (input.id) {
    const { error } = await supabase.from("goals").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("goals").insert(row);
    if (error) throw new Error(error.message);
  }

  refresh();
}
