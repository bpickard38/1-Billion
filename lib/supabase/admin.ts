import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Service-role client: bypasses RLS entirely. Only for the cron route
// (app/api/cron/tick/route.ts), which has to read/write across every user's
// rows — never import this from anything a browser request can reach.
// Every query made with it must filter by user_id itself; RLS won't.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
