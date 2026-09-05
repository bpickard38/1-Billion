"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, DEFAULT_TIMEZONE } from "@/lib/dates";
import { toCsv } from "@/lib/csv";

export type ContactInput = {
  id?: string;
  name: string;
  company: string | null;
  industry: string | null;
  role: string | null;
  type: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  whereMet: string | null;
  expertise: string | null;
  interests: string | null;
  howICanHelp: string | null;
  lastContactOn: string | null;
  followUpOn: string | null;
  wouldPilot: string | null;
  notes: string | null;
};

export async function upsertContact(input: ContactInput) {
  const supabase = await createClient();
  const row = {
    name: input.name,
    company: input.company,
    industry: input.industry,
    role: input.role,
    type: input.type,
    email: input.email,
    phone: input.phone,
    linkedin: input.linkedin,
    where_met: input.whereMet,
    expertise: input.expertise,
    interests: input.interests,
    how_i_can_help: input.howICanHelp,
    last_contact_on: input.lastContactOn,
    follow_up_on: input.followUpOn,
    would_pilot: input.wouldPilot,
    notes: input.notes,
  };

  if (input.id) {
    const { error } = await supabase.from("contacts").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("contacts").insert(row);
    if (error) throw new Error(error.message);
  }

  refresh();
}

export type ProblemTagInput = {
  problemId?: string;
  newTitle?: string;
  painScore: number | null;
  quote: string | null;
};

export type InterviewInput = {
  contactId: string;
  date: string;
  notes: string | null;
  currentSolution: string | null;
  estimatedCost: number | null;
  painScore: number | null;
  wouldPilot: string | null;
  followUp: string | null;
  followUpOn: string | null;
  problemTags: ProblemTagInput[];
};

async function findOrCreateProblem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string
): Promise<string> {
  const { data: inserted, error: insertError } = await supabase
    .from("problems")
    .insert({ title })
    .select("id")
    .single();
  if (!insertError && inserted) return inserted.id;

  if (insertError?.code !== "23505") throw new Error(insertError?.message ?? "Could not create problem");

  const { data: existing, error: selectError } = await supabase
    .from("problems")
    .select("id")
    .eq("title", title)
    .single();
  if (selectError || !existing) throw new Error(selectError?.message ?? "Problem lookup failed");
  return existing.id;
}

export async function logInterview(input: InterviewInput) {
  const supabase = await createClient();

  const { data: interview, error: interviewError } = await supabase
    .from("interviews")
    .insert({
      contact_id: input.contactId,
      date: input.date,
      notes: input.notes,
      current_solution: input.currentSolution,
      estimated_cost: input.estimatedCost,
      pain_score: input.painScore,
      would_pilot: input.wouldPilot,
      follow_up: input.followUp,
    })
    .select("id")
    .single();
  if (interviewError || !interview) throw new Error(interviewError?.message ?? "Could not save interview");

  for (const tag of input.problemTags) {
    const problemId = tag.problemId ?? (tag.newTitle ? await findOrCreateProblem(supabase, tag.newTitle) : null);
    if (!problemId) continue;
    const { error } = await supabase.from("interview_problems").insert({
      interview_id: interview.id,
      problem_id: problemId,
      pain_score: tag.painScore,
      quote: tag.quote,
    });
    if (error) throw new Error(error.message);
  }

  const { error: contactError } = await supabase
    .from("contacts")
    .update({
      last_contact_on: input.date,
      follow_up_on: input.followUpOn,
    })
    .eq("id", input.contactId);
  if (contactError) throw new Error(contactError.message);

  refresh();
}

export type ProblemInput = {
  id: string;
  title: string;
  description: string | null;
  userRole: string | null;
  buyer: string | null;
  frequency: string | null;
  existingSolution: string | null;
  laborCost: string | null;
  revenueImpact: string | null;
  urgency: number | null;
  wtp: string | null;
  aiOpportunity: number | null;
  competition: string | null;
  tam: string | null;
  expansion: string | null;
  access: string | null;
  score: number | null;
};

export async function upsertProblem(input: ProblemInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("problems")
    .update({
      title: input.title,
      description: input.description,
      user_role: input.userRole,
      buyer: input.buyer,
      frequency: input.frequency,
      existing_solution: input.existingSolution,
      labor_cost: input.laborCost,
      revenue_impact: input.revenueImpact,
      urgency: input.urgency,
      wtp: input.wtp,
      ai_opportunity: input.aiOpportunity,
      competition: input.competition,
      tam: input.tam,
      expansion: input.expansion,
      access: input.access,
      score: input.score,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  refresh();
}

export async function getFollowUpDueCount(): Promise<number> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("timezone").maybeSingle();
  const today = getLocalDateString(new Date(), profile?.timezone ?? DEFAULT_TIMEZONE);

  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .not("follow_up_on", "is", null)
    .lte("follow_up_on", today);

  return count ?? 0;
}

export async function exportContactsCsv(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("contacts").select("*").order("name");
  return toCsv(data ?? [], [
    { key: "name", header: "Name" },
    { key: "company", header: "Company" },
    { key: "industry", header: "Industry" },
    { key: "role", header: "Role" },
    { key: "type", header: "Type" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "linkedin", header: "LinkedIn" },
    { key: "where_met", header: "Where met" },
    { key: "expertise", header: "Expertise" },
    { key: "interests", header: "Interests" },
    { key: "how_i_can_help", header: "How I can help" },
    { key: "last_contact_on", header: "Last contact" },
    { key: "follow_up_on", header: "Follow up" },
    { key: "would_pilot", header: "Would pilot" },
    { key: "notes", header: "Notes" },
  ]);
}

export async function exportInterviewsCsv(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interviews")
    .select("*, contacts(name)")
    .order("date", { ascending: false });
  const rows = (data ?? []).map((row) => ({
    ...row,
    contact_name: (row as { contacts?: { name: string } | null }).contacts?.name ?? "",
  }));
  return toCsv(rows, [
    { key: "contact_name", header: "Contact" },
    { key: "date", header: "Date" },
    { key: "notes", header: "Notes" },
    { key: "current_solution", header: "Current solution" },
    { key: "estimated_cost", header: "Estimated cost" },
    { key: "pain_score", header: "Pain score" },
    { key: "would_pilot", header: "Would pilot" },
    { key: "follow_up", header: "Follow up" },
  ]);
}

export async function exportProblemsCsv(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("problems").select("*").order("title");
  return toCsv(data ?? [], [
    { key: "title", header: "Title" },
    { key: "description", header: "Description" },
    { key: "user_role", header: "User" },
    { key: "buyer", header: "Buyer" },
    { key: "frequency", header: "Frequency" },
    { key: "existing_solution", header: "Existing solution" },
    { key: "labor_cost", header: "Labor cost" },
    { key: "revenue_impact", header: "Revenue impact" },
    { key: "urgency", header: "Urgency" },
    { key: "wtp", header: "WTP" },
    { key: "ai_opportunity", header: "AI opportunity" },
    { key: "competition", header: "Competition" },
    { key: "tam", header: "TAM" },
    { key: "expansion", header: "Expansion" },
    { key: "access", header: "Access" },
    { key: "score", header: "Score" },
  ]);
}
