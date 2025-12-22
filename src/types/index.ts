export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type TargetProfile = "solo" | "couple" | "family" | "kids";

export type Category =
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

export type Destination = "cape_town" | "bali" | "japan";

export interface ExperienceCard {
  id: string;
  name: string;
  description: string;
  category: Category;
  targetProfile: TargetProfile;
  rarity: Rarity;
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

export const PROFILE_CONFIG: Record<
  TargetProfile,
  { label: string; icon: string; color: string }
> = {
  solo: { label: "Solo", icon: "👩", color: "#8B5CF6" },
  couple: { label: "Date Night", icon: "💑", color: "#EC4899" },
  family: { label: "Family", icon: "👨‍👩‍👧‍👧", color: "#10B981" },
  kids: { label: "Kids", icon: "👧👧", color: "#F59E0B" },
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

export const CATEGORY_CONFIG: Record<Category, { label: string; icon: string }> = {
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
