import type { Database } from "./supabase/types";

// Migration 0013 is now live and `npm run db:types` has regenerated
// supabase/types.ts to match, so the Database type already has `todos` and
// `planning_chat_messages`. This alias just keeps the existing import
// surface (today/actions.ts, week/actions.ts, cron/tick, chat-actions.ts)
// stable — see lib/planning-database.ts for the same pattern.
export type AppDatabase = Database;
