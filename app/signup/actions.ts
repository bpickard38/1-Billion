"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || !password) redirect("/signup?error=missing");
  if (password.length < 8) redirect("/signup?error=short");
  if (password !== confirm) redirect("/signup?error=mismatch");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) redirect("/signup?error=failed");

  // "Confirm email" on: no session yet, user must click the emailed link first.
  if (!data.session) redirect("/login?notice=check-email");

  redirect("/today");
}
