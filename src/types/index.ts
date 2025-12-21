export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type TargetProfile = "kathi_solo" | "couple" | "family" | "kids";

export type Category =
  | "food"
  | "wine"
  | "animals"
  | "art"
  | "nature"
  | "culture"
  | "adventure"
  | "family";

export type Destination = "cape_town" | "bali" | "japan";

export interface ExperienceCard {
  id: string;
  name: string;
  description: string;
  category: Category;
  targetProfile: TargetProfile;
  rarity: Rarity;
  estimatedCost: string;
  currency: string;
  durationHours: number;
  bookingUrl?: string;
  bookingMethod?: string;
  imageUrl?: string;
  destination: Destination;
  isRevealed: boolean;
  weekNumber: number;
}

export const PROFILE_CONFIG: Record<
  TargetProfile,
  { label: string; icon: string; color: string }
> = {
  kathi_solo: { label: "Kathi Solo", icon: "👩", color: "#D4837E" },
  couple: { label: "Date Night", icon: "💑", color: "#E07B39" },
  family: { label: "Family Fun", icon: "👨‍👩‍👧‍👧", color: "#4A5568" },
  kids: { label: "Kids' Adventure", icon: "👧👧", color: "#059669" },
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
  animals: { label: "Animals", icon: "🦁" },
  art: { label: "Art", icon: "🎨" },
  nature: { label: "Nature", icon: "🌿" },
  culture: { label: "Culture", icon: "🏛️" },
  adventure: { label: "Adventure", icon: "🏔️" },
  family: { label: "Family", icon: "🎡" },
};
