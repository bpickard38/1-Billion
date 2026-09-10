"use server";

import { z } from "zod";
import { addDays, format, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { actionResult, databaseError, planningContext } from "@/lib/planning-server";
import { getLocalDateString, getLocalWeekday, localTimeToInstant } from "@/lib/dates";
import { defaultPreferences, preferencesSchema, taskSchema, proposeSchedule, type BusyBlock } from "@/lib/planner";
import { estimateWork } from "@/lib/planning-ai";
import { syncGoogleCalendarForUser, syncPlannedBlocks } from "@/lib/google";
import { materializeBlocks } from "@/lib/schedule";
import type { Json } from "@/lib/supabase/types";

async function calendarContext(days: number) {
  const context = await planningContext();
  const { db, base, user, timeZone } = context;
  const date = getLocalDateString(new Date(), timeZone);
  const endDate = format(addDays(parseISO(date),days),"yyyy-MM-dd");
  const { data: tokens, error: tokenError } = await base.from("google_tokens").select("*").maybeSingle();
  databaseError(tokenError);
  if (tokens) await syncGoogleCalendarForUser(base,user.id,tokens,timeZone,true);
  const { data: blocks, error } = await db.from("schedule_blocks").select("*").eq("user_id",user.id).lt("start_at",localTimeToInstant(endDate,"00:00",timeZone).toISOString()).gt("end_at",localTimeToInstant(date,"00:00",timeZone).toISOString());
  databaseError(error);
  const { data: templates, error: templateError } = await db.from("schedule_templates").select("*").eq("user_id",user.id);
  databaseError(templateError);
  const busy: BusyBlock[] = [...(blocks ?? [])];
  for (let day = 0; day < days; day++) {
    const d = format(addDays(parseISO(date),day),"yyyy-MM-dd");
    if (blocks?.some(b => b.date === d)) continue;
    const weekday = getLocalWeekday(localTimeToInstant(d,"12:00",timeZone),timeZone);
    busy.push(...materializeBlocks((templates ?? []).filter(t => t.weekday === weekday),d,timeZone));
  }
  return { ...context, date, busy, connected: Boolean(tokens) };
}

export async function getPlanningData(daysInput: number) {
  return actionResult(async () => {
    const days = z.union([z.literal(1),z.literal(7)]).parse(daysInput);
    const { db, user, timeZone, date, busy, connected } = await calendarContext(days);
    const [{ data: assignments, error }, { data: saved, error: prefsError }, { data: planned, error: plannedError }] = await Promise.all([
      db.from("canvas_assignments").select("*").eq("user_id",user.id).eq("active",true).eq("submitted",false).order("due_at",{ nullsFirst: false }),
      db.from("planning_preferences").select("preferences").eq("user_id",user.id).maybeSingle(),
      db.from("schedule_blocks").select("assignment_id,start_at,end_at,done").eq("user_id",user.id).not("assignment_id","is",null),
    ]);
    databaseError(error); databaseError(prefsError); databaseError(plannedError);
    const reserved: Record<string,number> = {};
    for (const block of planned ?? []) if (block.assignment_id && (block.done || Date.parse(block.end_at) > Date.now())) reserved[block.assignment_id] = (reserved[block.assignment_id] ?? 0) + Math.round((Date.parse(block.end_at)-Date.parse(block.start_at))/60000);
    const { data: recent, error: recentError } = await db.from("planning_drafts").select("id").eq("user_id",user.id).eq("status","confirmed").order("created_at",{ascending:false}).limit(1).maybeSingle();
    databaseError(recentError);
    const { data: recentBlocks, error: recentBlocksError } = recent ? await db.from("schedule_blocks").select("id,title,start_at,end_at,google_event_id").eq("planning_draft_id",recent.id).eq("user_id",user.id).order("start_at") : {data:[],error:null};
    databaseError(recentBlocksError);
    return { assignments: assignments ?? [], reserved, timeZone, date, busy: busy.sort((a,b) => a.start_at.localeCompare(b.start_at)), connected, preferences: preferencesSchema.safeParse(saved?.preferences).data ?? defaultPreferences, aiReady: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL), recentPlan: recent && recentBlocks?.length ? { id:recent.id, blocks:recentBlocks } : null };
  });
}

export async function estimateTasks(idsInput: string[], requestInput: string) {
  return actionResult(async () => {
    const ids = z.array(z.string().uuid()).max(20).parse(idsInput);
    const request = z.string().max(4000).parse(requestInput);
    const { db, user } = await planningContext();
    if (!ids.length && !request.trim()) throw new Error("Select assignments or describe what you want to do.");
    const { data: allowed, error: limitError } = await db.rpc("claim_planner_ai",{});
    databaseError(limitError);
    if (!allowed) throw new Error("Please wait 30 seconds between AI requests.");
    const { data: assignments, error } = await db.from("canvas_assignments").select("*").eq("user_id",user.id).eq("active",true).eq("submitted",false).in("id", ids);
    databaseError(error);
    if ((assignments ?? []).length !== new Set(ids).size) throw new Error("Some assignments changed. Refresh the list first.");
    const estimates = await estimateWork((assignments ?? []).map(a => ({ id: a.id, title: a.title, description: a.description })),request);
    if (new Set(estimates.map(e => e.id)).size !== estimates.length || ids.some(id => !estimates.some(e => e.id === id)) || estimates.some(e => !ids.includes(e.id) && !/^manual-\d+$/.test(e.id))) throw new Error("AI did not match the selected tasks. Please try again.");
    for (const estimate of estimates) {
      if (!ids.includes(estimate.id)) continue;
      databaseError((await db.from("canvas_assignments").update({ estimated_minutes: estimate.minutes, estimate_note: estimate.explanation, estimate_source: "ai" }).eq("id",estimate.id).eq("user_id",user.id)).error);
    }
    return estimates.map(e => { const a = assignments?.find(a => a.id === e.id); return { ...e, id: a?.id ?? crypto.randomUUID(), title: a?.title ?? e.title, dueAt: a?.due_at ?? null, assignmentId: a?.id ?? null }; });
  });
}

export async function previewPlan(input: unknown) {
  return actionResult(async () => {
    const value = z.object({ days: z.union([z.literal(1),z.literal(7)]), preferences: preferencesSchema, tasks: z.array(taskSchema).min(1).max(30) }).parse(input);
    const { db, user, timeZone, date, busy } = await calendarContext(value.days);
    const ids = value.tasks.flatMap(t => t.assignmentId ? [t.assignmentId] : []);
    if (new Set(ids).size !== ids.length) throw new Error("Select each assignment only once.");
    const { data: assignments, error } = await db.from("canvas_assignments").select("*").eq("user_id",user.id).in("id",ids);
    databaseError(error);
    const { data: planned, error: plannedError } = await db.from("schedule_blocks").select("assignment_id,start_at,end_at,done").eq("user_id",user.id).in("assignment_id",ids);
    databaseError(plannedError);
    const tasks = value.tasks.map(t => {
      if (!t.assignmentId) return t;
      const a = assignments?.find(a => a.id === t.assignmentId && a.active && !a.submitted);
      if (!a) throw new Error("An assignment changed. Refresh the list first.");
      const reserved = (planned ?? []).filter(b => b.assignment_id === a.id && (b.done || Date.parse(b.end_at) > Date.now())).reduce((sum,b) => sum + Math.round((Date.parse(b.end_at)-Date.parse(b.start_at))/60000),0);
      return { ...t, title: a.title, dueAt: a.due_at, minutes: Math.max(0,t.minutes-reserved) };
    });
    for (const task of value.tasks.filter(t => t.assignmentId)) {
      const current = assignments?.find(a => a.id === task.assignmentId);
      if (current?.estimated_minutes !== task.minutes) databaseError((await db.from("canvas_assignments").update({ estimated_minutes: task.minutes, estimate_source: "user", estimate_note: "Your estimate" }).eq("id",task.assignmentId!).eq("user_id",user.id)).error);
    }
    databaseError((await db.from("planning_preferences").upsert({ user_id:user.id, preferences: value.preferences })).error);
    const proposal = proposeSchedule(tasks.filter(t => t.minutes > 0),busy,date,value.days,timeZone,value.preferences);
    if (proposal.blocks.length > 100) throw new Error("This plan has too many sessions. Select fewer tasks.");
    let id: string | null = null;
    if (proposal.blocks.length) {
      const { data, error: saveError } = await db.from("planning_drafts").insert({ user_id:user.id, blocks: proposal.blocks as unknown as Json }).select("id").single();
      databaseError(saveError); id = data!.id;
    }
    return { ...proposal, id, timeZone };
  });
}

export async function confirmPlan(idInput: string) {
  return actionResult(async () => {
    const id = z.string().uuid().parse(idInput);
    const { db, base, user, timeZone } = await planningContext();
    const { data: draft, error: draftError } = await db.from("planning_drafts").select("status").eq("id",id).eq("user_id",user.id).single();
    databaseError(draftError);
    // Once confirmed, retries only finish pending Google writes.
    if (draft?.status === "draft") {
      const { data: tokens, error } = await base.from("google_tokens").select("*").maybeSingle();
      databaseError(error);
      if (tokens) await syncGoogleCalendarForUser(base,user.id,tokens,timeZone,true);
    }
    const { data: blocks, error } = await db.rpc("confirm_planning_draft",{ draft_id:id });
    if (error) {
      if (error.code === "P0001") throw new Error(error.message);
      databaseError(error);
    }
    const sync = await syncPlannedBlocks(base,blocks ?? []);
    revalidatePath("/schedule"); revalidatePath("/today");
    return { ...sync, count: blocks?.length ?? 0 };
  });
}

export async function undoPlan(idInput: string) {
  return actionResult(async () => {
    const id = z.string().uuid().parse(idInput);
    const { db, base, user, timeZone } = await planningContext();
    const { data: tokens, error: tokenError } = await base.from("google_tokens").select("*").maybeSingle();
    databaseError(tokenError);
    if (tokens) await syncGoogleCalendarForUser(base,user.id,tokens,timeZone,true);
    const { data: draft, error: draftError } = await db.from("planning_drafts").select("blocks,status").eq("id",id).eq("user_id",user.id).single();
    databaseError(draftError);
    if (!draft || draft.status !== "confirmed") throw new Error("This plan is not saved or was already undone.");
    const { data: blocks, error } = await db.from("schedule_blocks").select("*").eq("planning_draft_id",id).eq("user_id",user.id);
    databaseError(error);
    if (blocks?.some(b => b.done)) throw new Error("This plan includes completed sessions. Remove individual blocks from your calendar instead.");
    const original = z.array(z.object({title:z.string(),start_at:z.string(),end_at:z.string()})).parse(draft.blocks);
    if (blocks?.some(b => b.google_recurring_event_id || !original.some(o => o.title === b.title && Date.parse(o.start_at) === Date.parse(b.start_at) && Date.parse(o.end_at) === Date.parse(b.end_at)))) throw new Error("Some sessions were edited after planning. Remove them individually from your calendar to preserve those changes.");
    const sync = await syncPlannedBlocks(base,blocks ?? [],true);
    if (sync.failed) throw new Error("Some Google events could not be removed. Retry undo to finish; your local blocks are still available.");
    databaseError((await db.from("schedule_blocks").delete().eq("planning_draft_id",id).eq("user_id",user.id)).error);
    databaseError((await db.from("planning_drafts").update({ status: "undone" }).eq("id",id).eq("user_id",user.id)).error);
    revalidatePath("/schedule"); revalidatePath("/today");
    return true;
  });
}
