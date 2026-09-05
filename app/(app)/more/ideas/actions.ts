"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMonthStartDateString, localTimeToInstant, DEFAULT_TIMEZONE } from "@/lib/dates";

export async function addIdea(input: {
  title: string;
  whyInteresting: string | null;
  researchLater: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("ideas").insert({
    title: input.title,
    why_interesting: input.whyInteresting,
    research_later: input.researchLater,
  });
  if (error) throw new Error(error.message);

  refresh();
}

export async function updateIdeaStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ideas").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
}

// Used by the monthly review sheet only: sets status AND stamps reviewed_at,
// distinct from `updateIdeaStatus` (day-to-day status changes on the Ideas
// list, which should never count as "reviewed this month").
export async function reviewIdea(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ideas")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
}

export type IdeaToReview = {
  id: string;
  title: string;
  why_interesting: string | null;
  created_at: string;
};

export async function getIdeasToReview(): Promise<IdeaToReview[]> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("timezone").maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const monthStart = getMonthStartDateString(new Date(), timezone);
  const monthStartInstant = localTimeToInstant(monthStart, "00:00", timezone).toISOString();

  const { data } = await supabase
    .from("ideas")
    .select("id, title, why_interesting, created_at")
    .eq("status", "parked")
    .lt("created_at", monthStartInstant)
    .or(`reviewed_at.is.null,reviewed_at.lt.${monthStartInstant}`)
    .order("created_at");

  return data ?? [];
}
