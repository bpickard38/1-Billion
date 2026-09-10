"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncGoogleCalendarForUser } from "@/lib/google";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

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

export async function syncGoogleCalendarNow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const [{ data: tokenRow }, { data: profile }] = await Promise.all([
    supabase.from("google_tokens").select("*").maybeSingle(),
    supabase.from("profiles").select("timezone").maybeSingle(),
  ]);
  if (!tokenRow) return;

  await syncGoogleCalendarForUser(supabase, user.id, tokenRow, profile?.timezone ?? DEFAULT_TIMEZONE);

  refresh();
}
