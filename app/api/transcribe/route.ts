import { createClient } from "@/lib/supabase/server";
import { transcribe } from "@/lib/systems-ai";

// Voice button on "New system": the browser posts a short recording here,
// we send it to OpenAI speech-to-text and return the text.
// A route handler (not a server action) because server action bodies are
// capped at 1 MB by default and a minute of iPhone audio can exceed that.

const MAX_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request limit

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "No recording received." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ error: "That recording is too long. Keep it under a minute." }, { status: 413 });
  }

  try {
    const text = await transcribe(audio);
    if (!text) return Response.json({ error: "Didn't catch anything. Try again." }, { status: 422 });
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Transcription failed." }, { status: 502 });
  }
}
