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
      appointments: {
        Row: {
          approved_by: string | null
          created_at: string
          date: string
          duration: number
          end_time: string
          id: string
          location: string | null
          notes: string | null
          opening_id: string
          provider_id: string
          service: string
          start_time: string
          status: string
          updated_at: string
          user_id: string
          worker: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          date: string
          duration: number
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          opening_id: string
          provider_id: string
          service: string
          start_time: string
          status?: string
          updated_at?: string
          user_id: string
          worker: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          date?: string
          duration?: number
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          opening_id?: string
          provider_id?: string
          service?: string
          start_time?: string
          status?: string
          updated_at?: string
          user_id?: string
          worker?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_opening_id_fkey"
            columns: ["opening_id"]
            isOneToOne: false
            referencedRelation: "openings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          recipient_ids: string[]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json
          recipient_ids?: string[]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json
          recipient_ids?: string[]
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          bookmarked_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bookmarked_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bookmarked_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_bookmarked_user_id_fkey"
            columns: ["bookmarked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_bookmarked_user_id_fkey"
            columns: ["bookmarked_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          id: string
          appointment_id: string
          customer_id: string
          note: string | null
          photo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          customer_id: string
          note?: string | null
          photo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          customer_id?: string
          note?: string | null
          photo?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      openings: {
        Row: {
          created_at: string
          date: string
          duration: number
          end_time: string
          hourly_rate: number
          id: string
          is_available: boolean
          location: string | null
          service: string
          start_time: string
          updated_at: string
          user_id: string
          worker: string
        }
        Insert: {
          created_at?: string
          date: string
          duration: number
          end_time: string
          hourly_rate?: number
          id?: string
          is_available?: boolean
          location?: string | null
          service: string
          start_time: string
          updated_at?: string
          user_id: string
          worker: string
        }
        Update: {
          created_at?: string
          date?: string
          duration?: number
          end_time?: string
          hourly_rate?: number
          id?: string
          is_available?: boolean
          location?: string | null
          service?: string
          start_time?: string
          updated_at?: string
          user_id?: string
          worker?: string
        }
        Relationships: [
          {
            foreignKeyName: "openings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "openings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_workers: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          org_id: string
          phone: string | null
          skills: string[]
          status: Database["public"]["Enums"]["worker_invite_status"]
          updated_at: string
          user_id: string | null
          worker_email: string
          worker_name: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number
          id?: string
          org_id: string
          phone?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["worker_invite_status"]
          updated_at?: string
          user_id?: string | null
          worker_email: string
          worker_name: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          org_id?: string
          phone?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["worker_invite_status"]
          updated_at?: string
          user_id?: string | null
          worker_email?: string
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_workers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_workers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          details: string | null
          id: string
          is_default: boolean
          label: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          is_default?: boolean
          label: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          is_default?: boolean
          label?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          address_public: boolean | null
          avatar_url: string | null
          created_at: string
          email: string | null
          email_public: boolean | null
          full_name: string | null
          hourly_rate: number
          hourly_rate_public: boolean | null
          id: string
          introduction: string | null
          phone: string | null
          phone_public: boolean | null
          skills: string[]
          skills_public: boolean | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_public?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_public?: boolean | null
          full_name?: string | null
          hourly_rate?: number
          hourly_rate_public?: boolean | null
          id: string
          introduction?: string | null
          phone?: string | null
          phone_public?: boolean | null
          skills?: string[]
          skills_public?: boolean | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_public?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_public?: boolean | null
          full_name?: string | null
          hourly_rate?: number
          hourly_rate_public?: boolean | null
          id?: string
          introduction?: string | null
          phone?: string | null
          phone_public?: boolean | null
          skills?: string[]
          skills_public?: boolean | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["report_category"]
          created_at: string
          description: string
          id: string
          reported_review_id: string | null
          reported_user_id: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description: string
          id?: string
          reported_review_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string
          id?: string
          reported_review_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_review_id_fkey"
            columns: ["reported_review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          rating: number
          review_text: string | null
          reviewed_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          reviewed_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          reviewed_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          plan_type: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_type: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workplace_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplace_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplace_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          introduction: string | null
          slug: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          introduction?: string | null
          slug?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          introduction?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invite: {
        Args: { _invite_id: string; _user_id: string }
        Returns: undefined
      }
      approve_appointment: {
        Args: { _appointment_id: string; _provider_id: string }
        Returns: undefined
      }
      book_opening: {
        Args: { _opening_id: string; _user_id: string }
        Returns: string
      }
      cancel_appointment: {
        Args: { _appointment_id: string; _caller_id: string }
        Returns: undefined
      }
      get_my_invites: {
        Args: { _email: string }
        Returns: {
          created_at: string
          id: string
          org_id: string
          org_name: string
          status: Database["public"]["Enums"]["worker_invite_status"]
          worker_name: string
        }[]
      }
      get_my_notifications: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          actor_id: string
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          is_unread: boolean
          metadata: Json
        }[]
      }
      get_public_profile: {
        Args: { profile_slug: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          introduction: string
          slug: string
        }[]
      }
      get_public_profile_by_id: {
        Args: { profile_id: string }
        Returns: {
          address: string
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          hourly_rate: number
          id: string
          introduction: string
          phone: string
          skills: string[]
          slug: string
        }[]
      }
      get_public_profile_names: {
        Args: { profile_ids: string[] }
        Returns: {
          full_name: string
          id: string
          slug: string
        }[]
      }
      get_subscription_status: {
        Args: { p_user_id: string }
        Returns: {
          expires_at: string
          is_active: boolean
          plan_type: string
          status: string
        }[]
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_worker_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_premium: { Args: { p_user_id: string }; Returns: boolean }
      is_worker_of: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _actor_id: string
          _entity_id: string
          _entity_type: string
          _event_type: string
          _metadata?: Json
          _recipient_ids: string[]
        }
        Returns: undefined
      }
      mark_notifications_read: { Args: never; Returns: undefined }
      modify_appointment: {
        Args: {
          _appointment_id: string
          _caller_id: string
          _new_opening_id: string
        }
        Returns: string
      }
      reject_appointment: {
        Args: { _appointment_id: string; _provider_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "USER" | "ORGANIZATION" | "INTERNAL_DEV"
      report_category:
        | "spam"
        | "harassment"
        | "fraud"
        | "inappropriate_content"
        | "fake_review"
        | "other"
      report_status: "pending" | "reviewing" | "resolved" | "dismissed"
      worker_invite_status: "invited" | "accepted" | "declined"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["USER", "ORGANIZATION", "INTERNAL_DEV"],
      report_category: [
        "spam",
        "harassment",
        "fraud",
        "inappropriate_content",
        "fake_review",
        "other",
      ],
      report_status: ["pending", "reviewing", "resolved", "dismissed"],
      worker_invite_status: ["invited", "accepted", "declined"],
    },
  },
} as const
