import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Memoized per request: (app)/layout.tsx, today/page.tsx, and
// week/actions.ts all need timezone/north_star on every navigation — this
// keeps that to one query instead of three.
export const getProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("timezone, north_star").maybeSingle();
  return data;
});
