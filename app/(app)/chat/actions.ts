"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { respond } from "@/lib/openai";

const HISTORY = 40; // messages sent back to the AI as context

const INSTRUCTIONS = `You are a helpful, friendly and concise assistant, like ChatGPT.
The app shows your reply as plain text: use short paragraphs and "-" for lists. No markdown headings, bold, tables or code fences unless the user asks for code.`;

export async function sendMessage(text: string): Promise<{ error: string } | { ok: true }> {
  const content = text.trim().slice(0, 8000);
  if (!content) return { error: "Type a message first." };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("claim_ai");
  if (!allowed) return { error: "One moment, wait a few seconds and send again." };

  const { error: insertError } = await supabase.from("chat_messages").insert({ role: "user", content });
  if (insertError) return { error: insertError.message };

  const { data: recent } = await supabase
    .from("chat_messages")
    .select("role, content")
    .order("created_at", { ascending: false })
    .limit(HISTORY);
  const messages = (recent ?? [])
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content }));

  try {
    const reply = await respond({ instructions: INSTRUCTIONS, input: messages, maxOutputTokens: 4000, timeoutMs: 100000 });
    const { error } = await supabase.from("chat_messages").insert({ role: "assistant", content: reply.slice(0, 20000) });
    if (error) return { error: error.message };
  } catch (e) {
    refresh();
    return { error: e instanceof Error ? e.message : "The AI request failed." };
  }

  refresh();
  return { ok: true };
}

export async function clearChat() {
  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").delete().not("id", "is", null);
  if (error) throw new Error(error.message);
  refresh();
}
