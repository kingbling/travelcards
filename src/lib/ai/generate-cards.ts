import type { CardCategory, TargetProfile, Rarity } from "@/types/database";
import { aiLogger } from "@/lib/logger";

export interface Traveler {
  name: string;
  age: number | null;
  role: string | null;
  interests: string[];
  isRecipient: boolean;
}

export interface DestinationContext {
  id: string;
  name: string;
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  type: "stay" | "roadtrip";
  waypoints?: string[];
}

// Slim experience format for AI prompt (minimal data)
export interface SlimExperience {
  id: string;
  source: "amadeus" | "google_places";
  name: string;
  price: string;
  categories?: string[];
}

// Full experience data for enrichment (kept in memory, not sent to AI)
export interface FullExperience {
  id: string;
  source: "amadeus" | "google_places";
  name: string;
  price: string;
  categories?: string[];
  bookingUrl?: string;
  pictureUrl?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface GenerationContext {
  journeyName: string;
  recipientName: string | null;
  travelers: Traveler[];
  destination: DestinationContext;
  existingCards: string[];
  categoryStats: Record<string, number>;
  slimExperiences?: SlimExperience[]; // Minimal data for AI prompt
}

// What AI returns - either a reference to existing data or a new experience
export interface AICardOutput {
  ref?: string; // ID reference to existing experience (e.g., "google:ChIJ123" or "amadeus:ABC")
  name: string;
  description: string;
  category: CardCategory;
  targetProfile: TargetProfile;
  rarity: Rarity;
  estimatedCost: string | null;
  durationHours: number | null;
  bookingMethod: string | null;
  // Only needed for AI-generated experiences (not from our data)
  bookingUrl?: string | null;
  pictureUrl?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
}

// Final enriched card with all data
export interface GeneratedCard {
  name: string;
  description: string;
  category: CardCategory;
  targetProfile: TargetProfile;
  rarity: Rarity;
  estimatedCost: string | null;
  durationHours: number | null;
  bookingMethod: string | null;
  bookingUrl: string | null;
  locationName: string | null;
  locationAddress: string | null;
  amadeusActivityId: string | null;
  pictureUrl: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  googlePlaceId?: string | null;
}

// Get season from date and hemisphere
function getSeason(dateStr: string | null, country: string | null): string {
  if (!dateStr) return "Unknown season";

  const date = new Date(dateStr);
  const month = date.getMonth();

  // Southern hemisphere countries
  const southernCountries = [
    "South Africa", "Australia", "New Zealand", "Argentina", "Chile",
    "Brazil", "Peru", "Bolivia", "Uruguay", "Paraguay"
  ];

  const isSouthern = country && southernCountries.some(c =>
    country.toLowerCase().includes(c.toLowerCase())
  );

  // Month to season mapping
  if (month >= 2 && month <= 4) return isSouthern ? "Autumn" : "Spring";
  if (month >= 5 && month <= 7) return isSouthern ? "Winter" : "Summer";
  if (month >= 8 && month <= 10) return isSouthern ? "Spring" : "Autumn";
  return isSouthern ? "Summer" : "Winter";
}

// Format date range nicely
function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "Dates not set";

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const startStr = startDate.toLocaleDateString("en-US", options);

  if (!endDate) return startStr;

  const endStr = endDate.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

// Build the user prompt for AI - now with slim experience references
export function buildPrompt(context: GenerationContext, cardCount: number): string {
  const { destination, travelers, existingCards, categoryStats, slimExperiences } = context;

  const season = getSeason(destination.startDate, destination.country);
  const dateRange = formatDateRange(destination.startDate, destination.endDate);

  // Build travelers section
  const travelerLines = travelers.map(t => {
    const interestStr = t.interests.length > 0 ? t.interests.join(", ") : "no specific interests listed";
    const recipientMark = t.isRecipient ? " ⭐ GIFT RECIPIENT" : "";
    const ageStr = t.age ? `, ${t.age}` : "";
    const roleStr = t.role ? `, ${t.role}` : "";
    return `- ${t.name}${ageStr}${roleStr}${recipientMark}: ${interestStr}`;
  }).join("\n");

  // Build existing cards section
  const existingSection = existingCards.length > 0
    ? `\nEXISTING CARDS (do NOT duplicate these):\n${existingCards.map(c => `- ${c}`).join("\n")}`
    : "";

  // Build category stats section
  const categoryLines = Object.entries(categoryStats)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(", ");
  const categorySection = categoryLines
    ? `\nCurrent card distribution: ${categoryLines}. Aim for variety.`
    : "";

  // Road trip specific section
  const routeSection = destination.type === "roadtrip" && destination.waypoints?.length
    ? `\nROUTE: ${destination.waypoints.join(" → ")}`
    : "";

  // Slim experiences section - just IDs and names!
  const hasExperiences = slimExperiences && slimExperiences.length > 0;
  const minFromData = Math.floor(cardCount * 0.6);
  const aiOriginalCount = cardCount - minFromData;

  const experiencesSection = hasExperiences
    ? `
AVAILABLE EXPERIENCES (${slimExperiences.length} options):
${slimExperiences.map(e => `• [${e.source}:${e.id}] ${e.name} - ${e.price}`).join("\n")}
`
    : "";

  const requirementsSection = hasExperiences
    ? `REQUIREMENTS:
1. SELECT ${minFromData}+ experiences from the list above using their [source:id] reference
2. ADD ${aiOriginalCount} original experiences (free local gems, events via web search)
3. Match to traveler interests, especially the ⭐ GIFT RECIPIENT
4. Mix budget levels: free → cheap → mid-range → 1-2 splurges`
    : `REQUIREMENTS:
1. Create ${cardCount} specific experiences for ${destination.name}
2. Budget mix: 40% free, 30% cheap (<$20), 20% mid-range, 10% splurge
3. Use web search to find current events/festivals
4. Match to traveler interests`;

  return `Create ${cardCount} experience cards for:

DESTINATION: ${destination.name}${destination.country ? `, ${destination.country}` : ""}
DATES: ${dateRange} (${season})${routeSection}

TRAVELERS:
${travelerLines}
${experiencesSection}${existingSection}${categorySection}

${requirementsSection}

OUTPUT FORMAT - JSON array:
[
  {
    "ref": "[source:id] from list above, OR null for your original ideas",
    "name": "Experience title (max 60 chars)",
    "description": "2-3 exciting sentences",
    "category": "food|wine|animals|art|nature|culture|adventure|family|spa|music",
    "targetProfile": "solo|couple|family|kids",
    "rarity": "common|uncommon|rare|legendary",
    "estimatedCost": "Price with USD, e.g. 'R150 (~$8)' or 'Free'",
    "durationHours": number,
    "bookingMethod": "How to book/access",
    "locationName": "Venue name (only if ref is null)",
    "locationAddress": "Address (only if ref is null)",
    "bookingUrl": "URL (only if ref is null and you found one via web search)",
    "pictureUrl": "Image URL (only if ref is null and you found one via web search)"
  }
]

IMPORTANT: When using "ref", we already have the location, URL, and image - just provide the creative fields (name, description, category, etc.)

Return ONLY the JSON array.`;
}

// System prompt for the AI - concise version
export const SYSTEM_PROMPT = `You are a local travel guide creating experience cards. Be authentic and diverse.

WHEN SELECTING FROM AVAILABLE EXPERIENCES:
- Use "ref" field with exact [source:id] format
- We have all the details (pictures, URLs, coordinates) - just add creative description
- Pick experiences matching traveler interests

WHEN ADDING YOUR OWN IDEAS:
- Set ref to null
- Provide locationName and locationAddress
- Use web search ONLY for current events/festivals during travel dates
- If you find a booking URL or image via web search, include it

BUDGET MIX: Mostly free/cheap, some mid-range, 1-2 splurges max.
PRICING: Use local currency + USD, e.g. "R150 (~$8)" or "Free"

Be specific with real venues. Prioritize what locals do, not just tourist spots.`;

// Parse AI response into structured cards
export function parseGeneratedCards(response: string): GeneratedCard[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      aiLogger.error("No JSON array found in response");
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      aiLogger.error("Parsed response is not an array");
      return [];
    }

    // Validate and normalize each card
    return parsed.map((card: Record<string, unknown>) => ({
      name: String(card.name || "").slice(0, 60),
      description: String(card.description || ""),
      category: validateCategory(String(card.category || "culture")),
      targetProfile: validateTargetProfile(String(card.targetProfile || "family")),
      rarity: validateRarity(String(card.rarity || "common")),
      estimatedCost: card.estimatedCost ? String(card.estimatedCost) : null,
      durationHours: typeof card.durationHours === "number" ? card.durationHours : null,
      bookingMethod: card.bookingMethod ? String(card.bookingMethod) : null,
      bookingUrl: card.bookingUrl && card.bookingUrl !== "null" ? String(card.bookingUrl) : null,
      locationName: card.locationName ? String(card.locationName) : null,
      locationAddress: card.locationAddress ? String(card.locationAddress) : null,
      amadeusActivityId: card.amadeusActivityId && card.amadeusActivityId !== "null" ? String(card.amadeusActivityId) : null,
      pictureUrl: card.pictureUrl && card.pictureUrl !== "null" ? String(card.pictureUrl) : null,
    }));
  } catch (error) {
    aiLogger.error("Failed to parse AI response:", error);
    return [];
  }
}

function validateCategory(cat: string): CardCategory {
  const valid: CardCategory[] = ["food", "wine", "animals", "art", "nature", "culture", "adventure", "family", "spa", "music"];
  return valid.includes(cat as CardCategory) ? (cat as CardCategory) : "culture";
}

function validateTargetProfile(profile: string): TargetProfile {
  const valid: TargetProfile[] = ["solo", "couple", "family", "kids"];
  return valid.includes(profile as TargetProfile) ? (profile as TargetProfile) : "family";
}

function validateRarity(rarity: string): Rarity {
  const valid: Rarity[] = ["common", "uncommon", "rare", "legendary"];
  return valid.includes(rarity as Rarity) ? (rarity as Rarity) : "common";
}

// Check for duplicate cards
export function isDuplicateCard(newCardName: string, existingNames: string[]): boolean {
  const newLower = newCardName.toLowerCase().trim();

  return existingNames.some(existing => {
    const existingLower = existing.toLowerCase().trim();
    // Check for exact match or significant overlap
    return newLower === existingLower ||
      newLower.includes(existingLower) ||
      existingLower.includes(newLower) ||
      // Similarity check - if 70%+ of words match
      wordSimilarity(newLower, existingLower) > 0.7;
  });
}

function wordSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let matches = 0;
  wordsA.forEach(word => {
    if (wordsB.has(word)) matches++;
  });

  return matches / Math.max(wordsA.size, wordsB.size);
}
