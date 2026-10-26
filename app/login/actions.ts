"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Action: runs on the server, never in the browser.
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?error=missing");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect("/login?error=invalid");

  redirect("/today");
}

// "Try the demo": every visitor gets their own throwaway anonymous account,
// filled with sample data by seed_demo() (0014_demo_seed.sql). The cron
// tick deletes anonymous accounts after 24h.
export async function demoLogin() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) redirect("/login?error=demo");

  const { error: seedError } = await supabase.rpc("seed_demo");
  if (seedError) {
    await supabase.auth.signOut();
    redirect("/login?error=demo");
  }

  redirect("/today");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
