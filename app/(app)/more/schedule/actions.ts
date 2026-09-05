"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TemplateBlockInput = {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
};

export async function upsertTemplateBlock(input: TemplateBlockInput) {
  const supabase = await createClient();

  if (input.id) {
    const { error } = await supabase
      .from("schedule_templates")
      .update({
        start_time: input.startTime,
        end_time: input.endTime,
        title: input.title,
        category: input.category,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { data: last } = await supabase
      .from("schedule_templates")
      .select("sort")
      .eq("weekday", input.weekday)
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort = (last?.sort ?? 0) + 1;

    const { error } = await supabase.from("schedule_templates").insert({
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      title: input.title,
      category: input.category,
      sort,
    });
    if (error) throw new Error(error.message);
  }

  refresh();
}

export async function deleteTemplateBlock(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
}
