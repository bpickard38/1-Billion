import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Memoized per request: pages and server actions both need the timezone.
export const getProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("timezone").maybeSingle();
  return data;
});
