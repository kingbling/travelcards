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
      cards: {
        Row: {
          ai_research: Json | null
          booking_date: string | null
          booking_method: string | null
          booking_url: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          destination_id: string | null
          duration_hours: number | null
          estimated_cost: string | null
          experience_date: string | null
          generation_prompt: string | null
          google_place_id: string | null
          id: string
          is_admin_preview: boolean | null
          is_prebooked: boolean | null
          is_revealed: boolean | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          name: string
          order_index: number | null
          personal_note: string | null
          picture_url: string | null
          rarity: string | null
          reveal_date: string | null
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
          created_at?: string | null
          currency?: string | null
          description?: string | null
          destination_id?: string | null
          duration_hours?: number | null
          estimated_cost?: string | null
          experience_date?: string | null
          generation_prompt?: string | null
          google_place_id?: string | null
          id?: string
          is_admin_preview?: boolean | null
          is_prebooked?: boolean | null
          is_revealed?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          name: string
          order_index?: number | null
          personal_note?: string | null
          picture_url?: string | null
          rarity?: string | null
          reveal_date?: string | null
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
          created_at?: string | null
          currency?: string | null
          description?: string | null
          destination_id?: string | null
          duration_hours?: number | null
          estimated_cost?: string | null
          experience_date?: string | null
          generation_prompt?: string | null
          google_place_id?: string | null
          id?: string
          is_admin_preview?: boolean | null
          is_prebooked?: boolean | null
          is_revealed?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          name?: string
          order_index?: number | null
          personal_note?: string | null
          picture_url?: string | null
          rarity?: string | null
          reveal_date?: string | null
          revealed_at?: string | null
          status?: string | null
          target_profile?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_destination_id_fkey"
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
          cover_photo_url: string | null
          cover_photo_attribution: Json | null
          created_at: string | null
          destination_type: string | null
          end_date: string | null
          end_location: string | null
          id: string
          journey_id: string | null
          name: string
          order_index: number | null
          reveals_per_week: number | null
          start_date: string | null
          start_location: string | null
          theme_colors: Json | null
          transport_mode: string | null
          treats_per_week: number | null
        }
        Insert: {
          country?: string | null
          cover_photo_url?: string | null
          cover_photo_attribution?: Json | null
          created_at?: string | null
          destination_type?: string | null
          end_date?: string | null
          end_location?: string | null
          id?: string
          journey_id?: string | null
          name: string
          order_index?: number | null
          reveals_per_week?: number | null
          start_date?: string | null
          start_location?: string | null
          theme_colors?: Json | null
          transport_mode?: string | null
          treats_per_week?: number | null
        }
        Update: {
          country?: string | null
          cover_photo_url?: string | null
          cover_photo_attribution?: Json | null
          created_at?: string | null
          destination_type?: string | null
          end_date?: string | null
          end_location?: string | null
          id?: string
          journey_id?: string | null
          name?: string
          order_index?: number | null
          reveals_per_week?: number | null
          start_date?: string | null
          start_location?: string | null
          theme_colors?: Json | null
          transport_mode?: string | null
          treats_per_week?: number | null
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
          advance_reveal_days: number | null
          created_at: string | null
          curator_id: string | null
          id: string
          is_published: boolean | null
          name: string
          published_at: string | null
          recipient_email: string | null
          recipient_name: string | null
          reveal_card_choices: number | null
          reveal_first_immediately: boolean | null
          reveals_per_week: number | null
          treats_per_week: number | null
          unique_slug: string | null
          updated_at: string | null
        }
        Insert: {
          access_code?: string | null
          advance_reveal_days?: number | null
          created_at?: string | null
          curator_id?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          published_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          reveal_card_choices?: number | null
          reveal_first_immediately?: boolean | null
          reveals_per_week?: number | null
          treats_per_week?: number | null
          unique_slug?: string | null
          updated_at?: string | null
        }
        Update: {
          access_code?: string | null
          advance_reveal_days?: number | null
          created_at?: string | null
          curator_id?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          published_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          reveal_card_choices?: number | null
          reveal_first_immediately?: boolean | null
          reveals_per_week?: number | null
          treats_per_week?: number | null
          unique_slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      love_letters: {
        Row: {
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
          journey_id: string
          revealed_at: string | null
        }
        Insert: {
          card_id?: string | null
          id?: string
          journey_id: string
          revealed_at?: string | null
        }
        Update: {
          card_id?: string | null
          id?: string
          journey_id?: string
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
          {
            foreignKeyName: "reveals_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      treat_reveals: {
        Row: {
          id: string
          journey_id: string
          revealed_at: string | null
          treat_id: string
        }
        Insert: {
          id?: string
          journey_id: string
          revealed_at?: string | null
          treat_id: string
        }
        Update: {
          id?: string
          journey_id?: string
          revealed_at?: string | null
          treat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treat_reveals_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treat_reveals_treat_id_fkey"
            columns: ["treat_id"]
            isOneToOne: false
            referencedRelation: "treats"
            referencedColumns: ["id"]
          },
        ]
      }
      treats: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          destination_id: string | null
          estimated_cost: string | null
          generation_prompt: string | null
          id: string
          is_revealed: boolean | null
          journey_id: string
          name: string
          order_index: number | null
          picture_url: string | null
          rarity: string | null
          revealed_at: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          estimated_cost?: string | null
          generation_prompt?: string | null
          id?: string
          is_revealed?: boolean | null
          journey_id: string
          name: string
          order_index?: number | null
          picture_url?: string | null
          rarity?: string | null
          revealed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          destination_id?: string | null
          estimated_cost?: string | null
          generation_prompt?: string | null
          id?: string
          is_revealed?: boolean | null
          journey_id?: string
          name?: string
          order_index?: number | null
          picture_url?: string | null
          rarity?: string | null
          revealed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treats_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treats_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// Application-specific types
export type CardCategory =
  | "food"
  | "wine"
  | "animals"
  | "art"
  | "nature"
  | "culture"
  | "adventure"
  | "family"
  | "spa"
  | "music";

export type TargetProfile = "solo" | "couple" | "family" | "kids";

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type CardStatus = "draft" | "approved" | "rejected";

export type DisplayOn = "intro" | "destination_start" | "card_reveal";

// Convenience types
export type Journey = Database["public"]["Tables"]["journeys"]["Row"];
export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type Destination = Database["public"]["Tables"]["destinations"]["Row"];
export type Card = Database["public"]["Tables"]["cards"]["Row"];
export type Reveal = Database["public"]["Tables"]["reveals"]["Row"];
export type LoveLetter = Database["public"]["Tables"]["love_letters"]["Row"];
export type EmailPreference = Database["public"]["Tables"]["email_preferences"]["Row"];
export type Memory = Database["public"]["Tables"]["memories"]["Row"];
export type MemoryPhoto = Database["public"]["Tables"]["memory_photos"]["Row"];

// Treats types (journey-wide surprises)
export type Treat = {
  id: string;
  journey_id: string;
  destination_id: string | null; // null = all destinations
  name: string;
  description: string | null;
  category: string | null;
  rarity: string | null;
  picture_url: string | null;
  estimated_cost: string | null;
  generation_prompt: string | null;
  is_revealed: boolean | null;
  revealed_at: string | null;
  order_index: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TreatReveal = {
  id: string;
  treat_id: string;
  journey_id: string;
  revealed_at: string | null;
};

// Extended types with relations
export type DestinationWithCards = Destination & {
  cards: Card[];
};

export type JourneyWithDestinations = Journey & {
  destinations: DestinationWithCards[];
  participants: Participant[];
};

// Config objects for UI
export const CATEGORY_CONFIG: Record<
  CardCategory,
  { icon: string; label: string; color: string }
> = {
  food: { icon: "🍽️", label: "Food & Dining", color: "#E07B39" },
  wine: { icon: "🍷", label: "Wine & Drinks", color: "#8B4513" },
  animals: { icon: "🦁", label: "Wildlife", color: "#228B22" },
  art: { icon: "🎨", label: "Art & Museums", color: "#9932CC" },
  nature: { icon: "🌿", label: "Nature", color: "#2E8B57" },
  culture: { icon: "🏛️", label: "Culture", color: "#B8860B" },
  adventure: { icon: "🧗", label: "Adventure", color: "#DC143C" },
  family: { icon: "👨‍👩‍👧‍👦", label: "Family Fun", color: "#4169E1" },
  spa: { icon: "💆", label: "Spa & Wellness", color: "#DB7093" },
  music: { icon: "🎵", label: "Music & Shows", color: "#FF6347" },
};

export const RARITY_CONFIG: Record<
  Rarity,
  { label: string; color: string; bgColor: string }
> = {
  common: { label: "Common", color: "#6B7280", bgColor: "#F3F4F6" },
  uncommon: { label: "Uncommon", color: "#059669", bgColor: "#D1FAE5" },
  rare: { label: "Rare", color: "#3B82F6", bgColor: "#DBEAFE" },
  legendary: { label: "Legendary", color: "#C9A227", bgColor: "#FEF3C7" },
};

export const PROFILE_CONFIG: Record<
  TargetProfile,
  { label: string; icon: string; color: string }
> = {
  solo: { label: "Solo", icon: "👤", color: "#8B5CF6" },
  couple: { label: "Couple", icon: "👫", color: "#EC4899" },
  family: { label: "Family", icon: "👨‍👩‍👧", color: "#10B981" },
  kids: { label: "Kids", icon: "🧒", color: "#F59E0B" },
};

// Helper function to safely get rarity config
export function getRarityConfig(rarity: string | null) {
  return RARITY_CONFIG[(rarity as Rarity) || "common"];
}

// Helper function to safely get category config  
export function getCategoryConfig(category: string | null) {
  return CATEGORY_CONFIG[(category as CardCategory) || "culture"];
}

// Helper function to safely get profile config
export function getProfileConfig(profile: string | null) {
  return PROFILE_CONFIG[(profile as TargetProfile) || "family"];
}
