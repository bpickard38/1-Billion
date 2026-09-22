import type { Database } from "./supabase/types";

// Migration 0012 is now live and `npm run db:types` has regenerated
// supabase/types.ts to match, so the Database type already has
// canvas_connections, canvas_assignments, planning_preferences,
// planning_drafts, the extra schedule_blocks columns, and both RPCs. This
// alias just keeps the existing import surface (lib/planning-server.ts,
// lib/app-database.ts) stable.
export type PlanningDatabase = Database;
