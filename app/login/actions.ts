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

// Shared public demo account (credentials are in the README on purpose).
export async function demoLogin() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: "demo@1billion.app",
    password: "OneBillionDemo!",
  });

  if (error) redirect("/login?error=demo");

  redirect("/today");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
