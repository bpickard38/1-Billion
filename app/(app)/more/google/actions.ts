"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function disconnectGoogle() {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("google_tokens").select("id, refresh_token").maybeSingle();
  if (!existing) return;

  if (existing.refresh_token) {
    // Best-effort: revoking on Google's side is a courtesy, not something
    // our own disconnected state depends on, so a failure here is ignored.
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(existing.refresh_token)}`,
      });
    } catch {
      // ignore
    }
  }

  const { error } = await supabase.from("google_tokens").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);

  refresh();
}
