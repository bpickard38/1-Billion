import "server-only";
import { z } from "zod";
import { respond } from "@/lib/openai";

// Turns "I want a morning routine with water, meditation, a workout..." into
// a named, ordered habit stack.

const draftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  steps: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
});

export type SystemDraft = z.infer<typeof draftSchema>;

const INSTRUCTIONS = `You help the user design a "system": a habit stack, an ordered list of small concrete actions done back to back (for example a Morning system: Wake up, Drink water, Meditate, Stretch, Work out, Shower, Eat breakfast, Read scriptures, Read a book).
Return a short name (1-3 words, no word "system") and 3-15 steps in the order they should be done.
Each step is a short imperative action under 60 characters. Add a duration only when it is useful, like "Meditate 10 min".
If the user lists their own steps, keep all of them in their order and only tidy the wording. Do not add advice or explanations.`;

export async function draftSystem(description: string): Promise<SystemDraft> {
  const raw = await respond({
    instructions: INSTRUCTIONS,
    input: description,
    schema: {
      name: "system_draft",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["name", "steps"],
        properties: {
          name: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
        },
      },
    },
  });
  try {
    return draftSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("The AI gave back something unusable. Try again or rephrase.");
  }
}

/**
 * Speech to text for the voice button. OPENAI_TRANSCRIBE_MODEL overrides the
 * default model.
 */
export async function transcribe(audio: File): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("AI isn't set up yet. Add OPENAI_API_KEY to the server environment.");

  const body = new FormData();
  body.append("file", audio, audio.name || "voice.webm");
  body.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    throw new Error(response.status === 429 ? "AI usage limit reached. Try again later." : "Couldn't understand the recording. Try again or type it.");
  }
  const payload = (await response.json()) as { text?: string };
  return (payload.text ?? "").trim();
}
