import type { Database, Json } from "./supabase/types";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row; Insert: Partial<Row> & Pick<Row, Required>; Update: Partial<Row>; Relationships: [];
};
export type Assignment = {
  id: string; user_id: string; external_id: string; course_id: string; course_name: string;
  title: string; description: string; due_at: string | null; url: string; submitted: boolean;
  active: boolean; estimated_minutes: number | null; estimate_note: string | null; estimate_source: string | null;
};
// Companion types for 0012 until the live database is migrated and db:types can regenerate.
export type PlanningDatabase = Omit<Database,"public"> & { public: Omit<Database["public"],"Tables" | "Functions"> & {
  Tables: Omit<Database["public"]["Tables"],"schedule_blocks"> & {
    canvas_connections: Table<{ user_id: string; token_ciphertext: string; courses: Json; selected_course_ids: string[]; last_synced_at: string | null }, "token_ciphertext">;
    canvas_assignments: Table<Assignment,"external_id" | "course_id" | "course_name" | "title" | "url">;
    planning_preferences: Table<{ user_id: string; preferences: Json; last_ai_at: string | null }>;
    planning_drafts: Table<{ id: string; user_id: string; blocks: Json; status: string; created_at: string },"blocks">;
    schedule_blocks: {
      Row: Database["public"]["Tables"]["schedule_blocks"]["Row"] & { planning_draft_id: string | null; assignment_id: string | null };
      Insert: Database["public"]["Tables"]["schedule_blocks"]["Insert"] & { planning_draft_id?: string | null; assignment_id?: string | null };
      Update: Database["public"]["Tables"]["schedule_blocks"]["Update"] & { planning_draft_id?: string | null; assignment_id?: string | null };
      Relationships: Database["public"]["Tables"]["schedule_blocks"]["Relationships"];
    };
  };
  Functions: Database["public"]["Functions"] & {
    confirm_planning_draft: { Args: { draft_id: string }; Returns: (Database["public"]["Tables"]["schedule_blocks"]["Row"] & { planning_draft_id: string | null; assignment_id: string | null })[] };
    claim_planner_ai: { Args: Record<string,never>; Returns: boolean };
  };
}};
