// Re-export core types and configs from database.ts (single source of truth)
export {
  type CardCategory,
  type TargetProfile,
  type Rarity,
  type CardStatus,
  type Journey,
  type Destination,
  type Card,
  type Memory,
  CATEGORY_CONFIG,
  RARITY_CONFIG,
  PROFILE_CONFIG,
  getRarityConfig,
  getCategoryConfig,
  getProfileConfig,
} from "./database";

// Alias for backwards compatibility
export type Category = import("./database").CardCategory;

// Component-specific types (used by Card and CardReveal components)
export interface ExperienceCard {
  id: string;
  name: string;
  description: string;
  category: import("./database").CardCategory;
  targetProfile: import("./database").TargetProfile;
  rarity: import("./database").Rarity;
  estimatedCost?: string;
  currency?: string;
  durationHours?: number;
  bookingUrl?: string;
  bookingMethod?: string;
  personalNote?: string;
  imageUrl?: string;
  destination?: string;
  isRevealed?: boolean;
  weekNumber?: number;
  themeColors?: { primary: string; secondary: string };
}

// Theme colors type used across journey pages
export interface ThemeColors {
  primary: string;
  secondary: string;
}

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: "#E07B39",
  secondary: "#C9A227",
};

// Helper to extract theme colors from destination
export function getThemeColors(
  themeColors: { primary?: string; secondary?: string } | null | undefined
): ThemeColors {
  return {
    primary: themeColors?.primary || DEFAULT_THEME_COLORS.primary,
    secondary: themeColors?.secondary || DEFAULT_THEME_COLORS.secondary,
  };
}

// Map-specific types
export interface CardLocation {
  id: string;
  name: string;
  description: string;
  category: import("./database").CardCategory | null;
  rarity: import("./database").Rarity | null;
  estimated_cost: string | null;
  duration_hours: number | null;
  location_lat: number;
  location_lng: number;
  location_name: string | null;
  location_address: string | null;
  picture_url: string | null;
  destination_id: string;
}
