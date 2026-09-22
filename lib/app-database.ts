import type { Json } from "./supabase/types";
import type { PlanningDatabase } from "./planning-database";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row; Insert: Partial<Row> & Pick<Row, Required>; Update: Partial<Row>; Relationships: [];
};

export type Todo = {
  id: string; user_id: string; date: string; title: string; done: boolean; sort: number;
  created_at: string; updated_at: string;
};

export type PlanningChatMessage = {
  id: string; user_id: string; date: string; role: "user" | "assistant"; content: string;
  payload: Json | null; created_at: string;
};

// Companion type for 0013 until the live database is migrated and db:types
// can regenerate (see lib/planning-database.ts for the same pattern).
export type AppDatabase = Omit<PlanningDatabase, "public"> & { public: Omit<PlanningDatabase["public"], "Tables"> & {
  Tables: PlanningDatabase["public"]["Tables"] & {
    todos: Table<Todo, "date" | "title">;
    planning_chat_messages: Table<PlanningChatMessage, "date" | "role" | "content">;
  };
}};
