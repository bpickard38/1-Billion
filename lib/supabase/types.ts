export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      canvas_assignments: {
        Row: {
          active: boolean
          course_id: string
          course_name: string
          description: string
          due_at: string | null
          estimate_note: string | null
          estimate_source: string | null
          estimated_minutes: number | null
          external_id: string
          id: string
          submitted: boolean
          title: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          course_id: string
          course_name: string
          description?: string
          due_at?: string | null
          estimate_note?: string | null
          estimate_source?: string | null
          estimated_minutes?: number | null
          external_id: string
          id?: string
          submitted?: boolean
          title: string
          url: string
          user_id?: string
        }
        Update: {
          active?: boolean
          course_id?: string
          course_name?: string
          description?: string
          due_at?: string | null
          estimate_note?: string | null
          estimate_source?: string | null
          estimated_minutes?: number | null
          external_id?: string
          id?: string
          submitted?: boolean
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      canvas_connections: {
        Row: {
          courses: Json
          last_synced_at: string | null
          selected_course_ids: string[]
          token_ciphertext: string
          user_id: string
        }
        Insert: {
          courses?: Json
          last_synced_at?: string | null
          selected_course_ids?: string[]
          token_ciphertext: string
          user_id?: string
        }
        Update: {
          courses?: Json
          last_synced_at?: string | null
          selected_course_ids?: string[]
          token_ciphertext?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_entries: {
        Row: {
          accomplished: string | null
          created_at: string
          date: string
          id: string
          learned: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accomplished?: string | null
          created_at?: string
          date: string
          id?: string
          learned?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          accomplished?: string | null
          created_at?: string
          date?: string
          id?: string
          learned?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          description: string | null
          ends_on: string | null
          id: string
          level: string
          parent_id: string | null
          sort: number
          starts_on: string | null
          status: string
          target_unit: string | null
          target_value: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          description?: string | null
          ends_on?: string | null
          id?: string
          level: string
          parent_id?: string | null
          sort?: number
          starts_on?: string | null
          status?: string
          target_unit?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          description?: string | null
          ends_on?: string | null
          id?: string
          level?: string
          parent_id?: string | null
          sort?: number
          starts_on?: string | null
          status?: string
          target_unit?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      google_tokens: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_sync_error: string | null
          last_synced_at: string | null
          primary_sync_token: string | null
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          primary_sync_token?: string | null
          refresh_token: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          primary_sync_token?: string | null
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          id: string
          kind: string
          ref_id: string
          sent_at: string
          sent_for: string
          user_id: string
        }
        Insert: {
          id?: string
          kind: string
          ref_id?: string
          sent_at?: string
          sent_for: string
          user_id?: string
        }
        Update: {
          id?: string
          kind?: string
          ref_id?: string
          sent_at?: string
          sent_for?: string
          user_id?: string
        }
        Relationships: []
      }
      planning_chat_messages: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          payload: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          date: string
          id?: string
          payload?: Json | null
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          payload?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      planning_drafts: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          blocks: Json
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      planning_preferences: {
        Row: {
          last_ai_at: string | null
          preferences: Json
          user_id: string
        }
        Insert: {
          last_ai_at?: string | null
          preferences?: Json
          user_id?: string
        }
        Update: {
          last_ai_at?: string | null
          preferences?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          north_star: string | null
          notification_prefs: Json
          score_weights: Json
          timezone: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id: string
          north_star?: string | null
          notification_prefs?: Json
          score_weights?: Json
          timezone?: string
          updated_at?: string
          week_start?: string
        }
        Update: {
          created_at?: string
          id?: string
          north_star?: string | null
          notification_prefs?: Json
          score_weights?: Json
          timezone?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          assignment_id: string | null
          category: string
          created_at: string
          date: string
          done: boolean
          end_at: string
          google_etag: string | null
          google_event_id: string | null
          google_recurring_event_id: string | null
          id: string
          planning_draft_id: string | null
          recurrence_days: number[] | null
          source: string
          start_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          category: string
          created_at?: string
          date: string
          done?: boolean
          end_at: string
          google_etag?: string | null
          google_event_id?: string | null
          google_recurring_event_id?: string | null
          id?: string
          planning_draft_id?: string | null
          recurrence_days?: number[] | null
          source?: string
          start_at: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          assignment_id?: string | null
          category?: string
          created_at?: string
          date?: string
          done?: boolean
          end_at?: string
          google_etag?: string | null
          google_event_id?: string | null
          google_recurring_event_id?: string | null
          id?: string
          planning_draft_id?: string | null
          recurrence_days?: number[] | null
          source?: string
          start_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "canvas_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_planning_draft_id_fkey"
            columns: ["planning_draft_id"]
            isOneToOne: false
            referencedRelation: "planning_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          category: string
          created_at: string
          end_time: string
          id: string
          sort: number
          start_time: string
          title: string
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          category: string
          created_at?: string
          end_time: string
          id?: string
          sort?: number
          start_time: string
          title: string
          updated_at?: string
          user_id?: string
          weekday: number
        }
        Update: {
          category?: string
          created_at?: string
          end_time?: string
          id?: string
          sort?: number
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      skill_categories: {
        Row: {
          created_at: string
          id: string
          is_side_tree: boolean
          name: string
          sort: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_side_tree?: boolean
          name: string
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_side_tree?: boolean
          name?: string
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          sort: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          sort?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          sort?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          created_at: string
          date: string
          done: boolean
          id: string
          sort: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          done?: boolean
          id?: string
          sort?: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          sort?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          answers: Json
          auto_closed: boolean
          biggest_issue: string | null
          breakdown: Json | null
          closed_at: string | null
          created_at: string
          id: string
          score: number | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          answers?: Json
          auto_closed?: boolean
          biggest_issue?: string | null
          breakdown?: Json | null
          closed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          updated_at?: string
          user_id?: string
          week_start: string
        }
        Update: {
          answers?: Json
          auto_closed?: boolean
          biggest_issue?: string | null
          breakdown?: Json | null
          closed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_planner_ai: { Args: never; Returns: boolean }
      confirm_planning_draft: {
        Args: { draft_id: string }
        Returns: {
          assignment_id: string | null
          category: string
          created_at: string
          date: string
          done: boolean
          end_at: string
          google_etag: string | null
          google_event_id: string | null
          google_recurring_event_id: string | null
          id: string
          planning_draft_id: string | null
          recurrence_days: number[] | null
          source: string
          start_at: string
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "schedule_blocks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      seed_demo: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
