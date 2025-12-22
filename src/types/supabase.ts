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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          ai_research: Json | null
          booking_date: string | null
          booking_method: string | null
          booking_url: string | null
          category: string | null
          chapter_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          destination_id: string | null
          duration_hours: number | null
          estimated_cost: string | null
          generation_prompt: string | null
          id: string
          is_prebooked: boolean | null
          is_revealed: boolean | null
          name: string
          order_index: number | null
          personal_note: string | null
          rarity: string | null
          revealed_at: string | null
          status: string | null
          target_profile: string | null
          updated_at: string | null
        }
        Insert: {
          ai_research?: Json | null
          booking_date?: string | null
          booking_method?: string | null
          booking_url?: string | null
          category?: string | null
          chapter_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          destination_id?: string | null
          duration_hours?: number | null
          estimated_cost?: string | null
          generation_prompt?: string | null
          id?: string
          is_prebooked?: boolean | null
          is_revealed?: boolean | null
          name: string
          order_index?: number | null
          personal_note?: string | null
          rarity?: string | null
          revealed_at?: string | null
          status?: string | null
          target_profile?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_research?: Json | null
          booking_date?: string | null
          booking_method?: string | null
          booking_url?: string | null
          category?: string | null
          chapter_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          destination_id?: string | null
          duration_hours?: number | null
          estimated_cost?: string | null
          generation_prompt?: string | null
          id?: string
          is_prebooked?: boolean | null
          is_revealed?: boolean | null
          name?: string
          order_index?: number | null
          personal_note?: string | null
          rarity?: string | null
          revealed_at?: string | null
          status?: string | null
          target_profile?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          card_count: number | null
          created_at: string | null
          description: string | null
          destination_id: string | null
          id: string
          name: string
          order_index: number | null
          reveal_cooldown_hours: number | null
          unlock_date: string | null
        }
        Insert: {
          card_count?: number | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          id?: string
          name: string
          order_index?: number | null
          reveal_cooldown_hours?: number | null
          unlock_date?: string | null
        }
        Update: {
          card_count?: number | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          id?: string
          name?: string
          order_index?: number | null
          reveal_cooldown_hours?: number | null
          unlock_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          country: string | null
          created_at: string | null
          destination_type: string | null
          end_date: string | null
          end_location: string | null
          id: string
          journey_id: string | null
          name: string
          order_index: number | null
          start_date: string | null
          start_location: string | null
          theme_colors: Json | null
          transport_mode: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          destination_type?: string | null
          end_date?: string | null
          end_location?: string | null
          id?: string
          journey_id?: string | null
          name: string
          order_index?: number | null
          start_date?: string | null
          start_location?: string | null
          theme_colors?: Json | null
          transport_mode?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          destination_type?: string | null
          end_date?: string | null
          end_location?: string | null
          id?: string
          journey_id?: string | null
          name?: string
          order_index?: number | null
          start_date?: string | null
          start_location?: string | null
          theme_colors?: Json | null
          transport_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destinations_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          booking_reminder: boolean | null
          booking_reminder_days: number | null
          card_ready: boolean | null
          chapter_unlocked: boolean | null
          created_at: string | null
          email: string
          id: string
          is_verified: boolean | null
          journey_id: string | null
          journey_start: boolean | null
          last_sent_at: string | null
          weekly_digest: boolean | null
        }
        Insert: {
          booking_reminder?: boolean | null
          booking_reminder_days?: number | null
          card_ready?: boolean | null
          chapter_unlocked?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          is_verified?: boolean | null
          journey_id?: string | null
          journey_start?: boolean | null
          last_sent_at?: string | null
          weekly_digest?: boolean | null
        }
        Update: {
          booking_reminder?: boolean | null
          booking_reminder_days?: number | null
          card_ready?: boolean | null
          chapter_unlocked?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          is_verified?: boolean | null
          journey_id?: string | null
          journey_start?: boolean | null
          last_sent_at?: string | null
          weekly_digest?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          access_code: string | null
          created_at: string | null
          curator_id: string | null
          id: string
          is_published: boolean | null
          name: string
          published_at: string | null
          recipient_email: string | null
          recipient_name: string | null
          unique_slug: string | null
          updated_at: string | null
        }
        Insert: {
          access_code?: string | null
          created_at?: string | null
          curator_id?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          published_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          unique_slug?: string | null
          updated_at?: string | null
        }
        Update: {
          access_code?: string | null
          created_at?: string | null
          curator_id?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          published_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          unique_slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      love_letters: {
        Row: {
          chapter_id: string | null
          content: string
          created_at: string | null
          destination_id: string | null
          display_on: string | null
          id: string
          journey_id: string | null
          order_index: number | null
          title: string
        }
        Insert: {
          chapter_id?: string | null
          content: string
          created_at?: string | null
          destination_id?: string | null
          display_on?: string | null
          id?: string
          journey_id?: string | null
          order_index?: number | null
          title: string
        }
        Update: {
          chapter_id?: string | null
          content?: string
          created_at?: string | null
          destination_id?: string | null
          display_on?: string | null
          id?: string
          journey_id?: string | null
          order_index?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "love_letters_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "love_letters_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "love_letters_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          card_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          note: string | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          card_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          card_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          memory_id: string | null
          order_index: number | null
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          memory_id?: string | null
          order_index?: number | null
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          memory_id?: string | null
          order_index?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_photos_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          age: number | null
          created_at: string | null
          id: string
          interests: string[] | null
          is_recipient: boolean | null
          journey_id: string | null
          name: string
          order_index: number | null
          role: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          id?: string
          interests?: string[] | null
          is_recipient?: boolean | null
          journey_id?: string | null
          name: string
          order_index?: number | null
          role?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          id?: string
          interests?: string[] | null
          is_recipient?: boolean | null
          journey_id?: string | null
          name?: string
          order_index?: number | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      reveals: {
        Row: {
          card_id: string | null
          id: string
          revealed_at: string | null
        }
        Insert: {
          card_id?: string | null
          id?: string
          revealed_at?: string | null
        }
        Update: {
          card_id?: string | null
          id?: string
          revealed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reveals_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      waypoints: {
        Row: {
          created_at: string | null
          day_number: number | null
          description: string | null
          destination_id: string | null
          id: string
          location: string | null
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          destination_id?: string | null
          id?: string
          location?: string | null
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          day_number?: number | null
          description?: string | null
          destination_id?: string | null
          id?: string
          location?: string | null
          name?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "waypoints_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
