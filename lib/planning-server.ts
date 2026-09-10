import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { PlanningDatabase } from "./planning-database";
import { DEFAULT_TIMEZONE } from "./dates";
import { ZodError } from "zod";

export async function planningContext() {
  const base = await createClient();
  const { data: { user } } = await base.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  const { data: profile, error } = await base.from("profiles").select("timezone").maybeSingle();
  if (error) throw new Error("Could not load your profile.");
  return { db: base as unknown as SupabaseClient<PlanningDatabase>, base, user, timeZone: profile?.timezone ?? DEFAULT_TIMEZONE };
}

export function databaseError(error: { message: string; code?: string } | null) {
  if (error) throw new Error(error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST202" ? "Planner setup is incomplete. Apply database migration 0012 first." : "Could not save or load planning data. Please try again.");
}

export async function actionResult<T>(fn: () => Promise<T>): Promise<{ data: T; error?: never } | { error: string; data?: never }> {
  try { return { data: await fn() }; }
  catch (error) { return { error: error instanceof ZodError ? "Please check the form values and try again." : error instanceof Error && !["TypeError","AbortError","TimeoutError"].includes(error.name) ? error.message : "The connection failed or timed out. Please try again." }; }
}
