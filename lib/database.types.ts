// Generated from the live schema. Do not edit by hand.
//
// Regenerate after any migration:
//   supabase gen types typescript --project-id <ref> > lib/database.types.ts
//
// Keeping this checked in is what makes a typo in a column name a build
// error rather than a runtime `undefined` in production.

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
  public: {
    Tables: {
      application_insights: {
        Row: {
          application_id: string
          generated_at: string
          model: string
          repo_findings: Json | null
          repo_stats: Json | null
          repo_url: string | null
          specificity: number
          specificity_reason: string
          summary: string
        }
        Insert: {
          application_id: string
          generated_at?: string
          model: string
          repo_findings?: Json | null
          repo_stats?: Json | null
          repo_url?: string | null
          specificity: number
          specificity_reason: string
          summary: string
        }
        Update: {
          application_id?: string
          generated_at?: string
          model?: string
          repo_findings?: Json | null
          repo_stats?: Json | null
          repo_url?: string | null
          specificity?: number
          specificity_reason?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_insights_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          display_id: number
          id: string
          responses: Json
          role: Database["public"]["Enums"]["application_role"]
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_id?: never
          id?: string
          responses?: Json
          role: Database["public"]["Enums"]["application_role"]
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_id?: never
          id?: string
          responses?: Json
          role?: Database["public"]["Enums"]["application_role"]
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_usage: {
        Row: {
          count: number
          day: string
          reviewer_id: string
        }
        Insert: {
          count?: number
          day?: string
          reviewer_id: string
        }
        Update: {
          count?: number
          day?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_usage_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          staff_role: Database["public"]["Enums"]["staff_role"] | null
          school: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          staff_role?: Database["public"]["Enums"]["staff_role"] | null
          school?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          staff_role?: Database["public"]["Enums"]["staff_role"] | null
          school?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          application_id: string
          created_at: string
          notes: string
          reviewer_id: string
          score: number
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          notes?: string
          reviewer_id: string
          score: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          notes?: string
          reviewer_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application_scores"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      application_summary: {
        Row: {
          created_at: string | null
          display_id: number | null
          email: string | null
          full_name: string | null
          id: string | null
          mean_score: number | null
          mean_z_score: number | null
          responses: Json | null
          review_count: number | null
          role: Database["public"]["Enums"]["application_role"] | null
          school: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_scores: {
        Row: {
          application_id: string | null
          mean_score: number | null
          mean_z_score: number | null
          review_count: number | null
        }
        Relationships: []
      }
      reviewer_calibration: {
        Row: {
          mean_score: number | null
          reviewer_id: string | null
          reviews_written: number | null
          score_stddev: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_insight_budget: {
        Args: { p_application_id: string }
        Returns: number
      }
      is_director: { Args: never; Returns: boolean }
      organizer_analytics: { Args: { p_targets: Json }; Returns: Json }
      reset_application_display_ids: { Args: never; Returns: undefined }
      reset_my_reviews: { Args: never; Returns: number }
      save_application_insight: {
        Args: {
          p_application_id: string
          p_summary: string
          p_specificity: number
          p_specificity_reason: string
          p_repo_url: string | null
          p_repo_stats: Json | null
          p_repo_findings: Json | null
          p_model: string
        }
        Returns: undefined
      }
      is_organizer: { Args: never; Returns: boolean }
      set_application_status: {
        Args: {
          p_application_id: string
          p_status: Database["public"]["Enums"]["application_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      application_role: "hacker" | "mentor" | "judge" | "volunteer"
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "accepted"
        | "waitlisted"
        | "rejected"
      staff_role: "reviewer" | "director"
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
  public: {
    Enums: {
      application_role: ["hacker", "mentor", "judge", "volunteer"],
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "accepted",
        "waitlisted",
        "rejected",
      ],
      staff_role: ["reviewer", "director"],
    },
  },
} as const
