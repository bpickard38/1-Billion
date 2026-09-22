"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { actionResult, databaseError, planningContext } from "@/lib/planning-server";
import { getLocalDateString, localTimeToInstant } from "@/lib/dates";
import { CATEGORIES } from "@/lib/categories";
import { chatTurn } from "@/lib/planning-chat-ai";
import type { AppDatabase } from "@/lib/app-database";
import type { Json } from "@/lib/supabase/types";
import { calendarContext, confirmPlan } from "./actions";

const OPENING_MESSAGE =
  "What do you want to get done today? Tell me what's on your mind and I'll turn it into a schedule and a to-do list — mention anything that's already fixed in time.";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function appDbContext() {
  const context = await planningContext();
  return { ...context, appDb: context.db as unknown as SupabaseClient<AppDatabase> };
}

export async function getPlanningChat() {
  return actionResult(async () => {
    const { appDb, user, timeZone } = await appDbContext();
    const date = getLocalDateString(new Date(), timeZone);

    const { data: existing, error } = await appDb
      .from("planning_chat_messages")
      .select("id, role, content, payload, created_at")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at");
    databaseError(error);
    if (existing && existing.length > 0) return { date, messages: existing };

    const { data: seeded, error: seedError } = await appDb
      .from("planning_chat_messages")
      .insert({ date, role: "assistant", content: OPENING_MESSAGE })
      .select("id, role, content, payload, created_at")
      .single();
    databaseError(seedError);
    return { date, messages: seeded ? [seeded] : [] };
  });
}

export async function sendPlanningMessage(dateInput: string, textInput: string) {
  return actionResult(async () => {
    const date = dateSchema.parse(dateInput);
    const text = z.string().trim().min(1).max(2000).parse(textInput);
    const { db, user, timeZone, busy } = await calendarContext(1);
    const appDb = db as unknown as SupabaseClient<AppDatabase>;

    const { data: history, error } = await appDb
      .from("planning_chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at");
    databaseError(error);

    const { data: userMsg, error: insertError } = await appDb
      .from("planning_chat_messages")
      .insert({ date, role: "user", content: text })
      .select("id, role, content, payload, created_at")
      .single();
    databaseError(insertError);

    const { data: existingTodos, error: todosError } = await appDb
      .from("todos")
      .select("title")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("sort");
    databaseError(todosError);

    const turn = await chatTurn({
      date,
      timeZone,
      busy: busy.map((b) => ({ title: b.title, start_at: b.start_at, end_at: b.end_at })),
      existingTodos: (existingTodos ?? []).map((t) => t.title),
      history: [...(history ?? []), { role: "user" as const, content: text }],
    });

    const payload = turn.ready ? { ready: true, todos: turn.todos, blocks: turn.blocks } : null;
    const { data: assistantMsg, error: assistantError } = await appDb
      .from("planning_chat_messages")
      .insert({ date, role: "assistant", content: turn.reply, payload: payload as unknown as Json })
      .select("id, role, content, payload, created_at")
      .single();
    databaseError(assistantError);

    return { userMessage: userMsg, assistantMessage: assistantMsg };
  });
}

const proposedTodoSchema = z.object({ title: z.string().trim().min(1).max(200) });
const proposedBlockSchema = z.object({
  title: z.string().trim().min(1).max(200),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  category: z.enum(CATEGORIES),
});

export async function confirmChatProposal(
  dateInput: string,
  todosInput: { title: string }[],
  blocksInput: { title: string; start: string; end: string; category: string }[]
) {
  return actionResult(async () => {
    const date = dateSchema.parse(dateInput);
    const todos = z.array(proposedTodoSchema).max(30).parse(todosInput);
    const blocks = z.array(proposedBlockSchema).max(30).parse(blocksInput);

    const { db, user, timeZone } = await planningContext();
    const appDb = db as unknown as SupabaseClient<AppDatabase>;

    let todosAdded = 0;
    if (todos.length > 0) {
      const { data: last } = await appDb
        .from("todos")
        .select("sort")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("sort", { ascending: false })
        .limit(1)
        .maybeSingle();
      let sort = (last?.sort ?? 0) + 1;
      const rows = todos.map((t) => ({ date, title: t.title, sort: sort++ }));
      const { error } = await appDb.from("todos").insert(rows);
      databaseError(error);
      todosAdded = rows.length;
    }

    const validBlocks = blocks
      .map((b) => ({
        title: b.title,
        category: b.category,
        start_at: localTimeToInstant(date, b.start, timeZone),
        end_at: localTimeToInstant(date, b.end, timeZone),
      }))
      .filter((b) => b.end_at > b.start_at)
      .sort((a, b) => a.start_at.getTime() - b.start_at.getTime());

    let blocksAdded = 0;
    if (validBlocks.length > 0) {
      const proposal = validBlocks.map((b) => ({
        title: b.title,
        start_at: b.start_at.toISOString(),
        end_at: b.end_at.toISOString(),
        date,
        category: b.category,
        assignment_id: null,
      }));
      const { data: draft, error: draftError } = await appDb
        .from("planning_drafts")
        .insert({ user_id: user.id, blocks: proposal as unknown as Json })
        .select("id")
        .single();
      databaseError(draftError);
      const confirmed = await confirmPlan(draft!.id);
      if (confirmed.error) throw new Error(confirmed.error);
      blocksAdded = confirmed.data!.count;
    }

    revalidatePath("/today");
    return { todosAdded, blocksAdded };
  });
}
