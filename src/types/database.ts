export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      journeys: {
        Row: {
          id: string;
          curator_id: string | null;
          name: string;
          recipient_name: string | null;
          recipient_email: string | null;
          unique_slug: string | null;
          access_code: string | null;
          is_published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          curator_id?: string | null;
          name: string;
          recipient_name?: string | null;
          recipient_email?: string | null;
          unique_slug?: string | null;
          access_code?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          curator_id?: string | null;
          name?: string;
          recipient_name?: string | null;
          recipient_email?: string | null;
          unique_slug?: string | null;
          access_code?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          journey_id: string | null;
          name: string;
          age: number | null;
          role: string | null;
          interests: string[] | null;
          is_recipient: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          journey_id?: string | null;
          name: string;
          age?: number | null;
          role?: string | null;
          interests?: string[] | null;
          is_recipient?: boolean;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          journey_id?: string | null;
          name?: string;
          age?: number | null;
          role?: string | null;
          interests?: string[] | null;
          is_recipient?: boolean;
          order_index?: number;
          created_at?: string;
        };
      };
      destinations: {
        Row: {
          id: string;
          journey_id: string | null;
          name: string;
          country: string | null;
          start_date: string | null;
          end_date: string | null;
          theme_colors: Json;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          journey_id?: string | null;
          name: string;
          country?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          theme_colors?: Json;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          journey_id?: string | null;
          name?: string;
          country?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          theme_colors?: Json;
          order_index?: number;
          created_at?: string;
        };
      };
      chapters: {
        Row: {
          id: string;
          destination_id: string | null;
          name: string;
          description: string | null;
          unlock_date: string | null;
          reveal_cooldown_hours: number;
          card_count: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          destination_id?: string | null;
          name: string;
          description?: string | null;
          unlock_date?: string | null;
          reveal_cooldown_hours?: number;
          card_count?: number;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          destination_id?: string | null;
          name?: string;
          description?: string | null;
          unlock_date?: string | null;
          reveal_cooldown_hours?: number;
          card_count?: number;
          order_index?: number;
          created_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          chapter_id: string | null;
          destination_id: string | null;
          name: string;
          description: string | null;
          category: CardCategory | null;
          target_profile: TargetProfile | null;
          rarity: Rarity;
          estimated_cost: string | null;
          currency: string;
          duration_hours: number | null;
          booking_url: string | null;
          booking_method: string | null;
          location_name: string | null;
          location_address: string | null;
          is_prebooked: boolean;
          booking_date: string | null;
          personal_note: string | null;
          status: CardStatus;
          ai_research: Json | null;
          generation_prompt: string | null;
          is_revealed: boolean;
          revealed_at: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chapter_id?: string | null;
          destination_id?: string | null;
          name: string;
          description?: string | null;
          category?: CardCategory | null;
          target_profile?: TargetProfile | null;
          rarity?: Rarity;
          estimated_cost?: string | null;
          currency?: string;
          duration_hours?: number | null;
          booking_url?: string | null;
          booking_method?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          is_prebooked?: boolean;
          booking_date?: string | null;
          personal_note?: string | null;
          status?: CardStatus;
          ai_research?: Json | null;
          generation_prompt?: string | null;
          is_revealed?: boolean;
          revealed_at?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chapter_id?: string | null;
          destination_id?: string | null;
          name?: string;
          description?: string | null;
          category?: CardCategory | null;
          target_profile?: TargetProfile | null;
          rarity?: Rarity;
          estimated_cost?: string | null;
          currency?: string;
          duration_hours?: number | null;
          booking_url?: string | null;
          booking_method?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          is_prebooked?: boolean;
          booking_date?: string | null;
          personal_note?: string | null;
          status?: CardStatus;
          ai_research?: Json | null;
          generation_prompt?: string | null;
          is_revealed?: boolean;
          revealed_at?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      reveals: {
        Row: {
          id: string;
          card_id: string | null;
          revealed_at: string;
        };
        Insert: {
          id?: string;
          card_id?: string | null;
          revealed_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string | null;
          revealed_at?: string;
        };
      };
      love_letters: {
        Row: {
          id: string;
          journey_id: string | null;
          title: string;
          content: string;
          display_on: DisplayOn | null;
          chapter_id: string | null;
          destination_id: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          journey_id?: string | null;
          title: string;
          content: string;
          display_on?: DisplayOn | null;
          chapter_id?: string | null;
          destination_id?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          journey_id?: string | null;
          title?: string;
          content?: string;
          display_on?: DisplayOn | null;
          chapter_id?: string | null;
          destination_id?: string | null;
          order_index?: number;
          created_at?: string;
        };
      };
      email_preferences: {
        Row: {
          id: string;
          journey_id: string | null;
          email: string;
          journey_start: boolean;
          chapter_unlocked: boolean;
          card_ready: boolean;
          weekly_digest: boolean;
          booking_reminder: boolean;
          booking_reminder_days: number;
          is_verified: boolean;
          last_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          journey_id?: string | null;
          email: string;
          journey_start?: boolean;
          chapter_unlocked?: boolean;
          card_ready?: boolean;
          weekly_digest?: boolean;
          booking_reminder?: boolean;
          booking_reminder_days?: number;
          is_verified?: boolean;
          last_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          journey_id?: string | null;
          email?: string;
          journey_start?: boolean;
          chapter_unlocked?: boolean;
          card_ready?: boolean;
          weekly_digest?: boolean;
          booking_reminder?: boolean;
          booking_reminder_days?: number;
          is_verified?: boolean;
          last_sent_at?: string | null;
          created_at?: string;
        };
      };
      memories: {
        Row: {
          id: string;
          card_id: string | null;
          note: string | null;
          rating: number | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id?: string | null;
          note?: string | null;
          rating?: number | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string | null;
          note?: string | null;
          rating?: number | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      memory_photos: {
        Row: {
          id: string;
          memory_id: string | null;
          storage_path: string;
          caption: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          memory_id?: string | null;
          storage_path: string;
          caption?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          memory_id?: string | null;
          storage_path?: string;
          caption?: string | null;
          order_index?: number;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Enum types
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

export type DisplayOn = "intro" | "chapter_start" | "destination_start" | "card_reveal";

// Convenience types
export type Journey = Database["public"]["Tables"]["journeys"]["Row"];
export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type Destination = Database["public"]["Tables"]["destinations"]["Row"];
export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type Card = Database["public"]["Tables"]["cards"]["Row"];
export type Reveal = Database["public"]["Tables"]["reveals"]["Row"];
export type LoveLetter = Database["public"]["Tables"]["love_letters"]["Row"];
export type EmailPreference = Database["public"]["Tables"]["email_preferences"]["Row"];
export type Memory = Database["public"]["Tables"]["memories"]["Row"];
export type MemoryPhoto = Database["public"]["Tables"]["memory_photos"]["Row"];

// Extended types with relations
export type ChapterWithCards = Chapter & {
  cards: Card[];
};

export type DestinationWithChapters = Destination & {
  chapters: ChapterWithCards[];
};

export type JourneyWithDestinations = Journey & {
  participants: Participant[];
  destinations: DestinationWithChapters[];
  love_letters: LoveLetter[];
};

export type CardWithMemory = Card & {
  memory?: Memory & {
    photos: MemoryPhoto[];
  };
};

// Theme colors type
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent?: string;
}

// Rarity configuration
export const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bgColor: string; glowClass: string }> = {
  common: {
    label: "Common",
    color: "#6B7280",
    bgColor: "#F3F4F6",
    glowClass: "card-glow-common",
  },
  uncommon: {
    label: "Uncommon",
    color: "#059669",
    bgColor: "#D1FAE5",
    glowClass: "card-glow-uncommon",
  },
  rare: {
    label: "Rare",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    glowClass: "card-glow-rare",
  },
  legendary: {
    label: "Legendary",
    color: "#C9A227",
    bgColor: "#FEF3C7",
    glowClass: "card-glow-legendary",
  },
};

// Profile configuration
export const PROFILE_CONFIG: Record<TargetProfile, { label: string; icon: string; color: string }> = {
  solo: {
    label: "Solo",
    icon: "👩",
    color: "#8B5CF6",
  },
  couple: {
    label: "Date Night",
    icon: "💑",
    color: "#EC4899",
  },
  family: {
    label: "Family",
    icon: "👨‍👩‍👧‍👧",
    color: "#10B981",
  },
  kids: {
    label: "Kids",
    icon: "👧👧",
    color: "#F59E0B",
  },
};

// Category configuration
export const CATEGORY_CONFIG: Record<CardCategory, { label: string; icon: string }> = {
  food: { label: "Food", icon: "🍽️" },
  wine: { label: "Wine", icon: "🍷" },
  animals: { label: "Animals", icon: "🐧" },
  art: { label: "Art", icon: "🎨" },
  nature: { label: "Nature", icon: "🌿" },
  culture: { label: "Culture", icon: "🏛️" },
  adventure: { label: "Adventure", icon: "🏔️" },
  family: { label: "Family Fun", icon: "🎉" },
  spa: { label: "Spa & Wellness", icon: "💆" },
  music: { label: "Music", icon: "🎵" },
};
