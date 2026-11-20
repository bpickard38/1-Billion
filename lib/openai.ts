import "server-only";

// One place that talks to OpenAI's Responses API. Used by system drafts,
// the workout planner and chat. Needs OPENAI_API_KEY and OPENAI_MODEL.

type Message = { role: "user" | "assistant"; content: string };

export async function respond({
  instructions,
  input,
  schema,
  maxOutputTokens = 2000,
  timeoutMs = 60000,
}: {
  instructions: string;
  input: string | Message[];
  /** JSON schema for structured output; the reply is then a JSON string. */
  schema?: { name: string; schema: Record<string, unknown> };
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!key || !model) {
    throw new Error("AI isn't set up yet. Add OPENAI_API_KEY and OPENAI_MODEL to the server environment.");
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: maxOutputTokens,
        instructions,
        input,
        ...(schema && {
          text: { format: { type: "json_schema", name: schema.name, strict: true, schema: schema.schema } },
        }),
      }),
    });
  } catch {
    throw new Error("The AI took too long to answer. Try again.");
  }

  if (!response.ok) {
    throw new Error(response.status === 429 ? "AI usage limit reached. Try again later." : "The AI request failed. Check the server's AI settings.");
  }

  const payload = await response.json();
  const text = (payload.output ?? [])
    .flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? [])
    .filter((c: { type: string }) => c.type === "output_text")
    .map((c: { text: string }) => c.text)
    .join("");
  if (!text) throw new Error("The AI didn't answer. Try again.");
  return text;
}
