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

export interface GenerationContext {
  journeyName: string;
  recipientName: string | null;
  travelers: Traveler[];
  destination: DestinationContext;
  existingCards: string[];
  categoryStats: Record<string, number>;
  realActivities?: string; // Formatted real activities from Amadeus
}

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

// Build the user prompt for AI
export function buildPrompt(context: GenerationContext, cardCount: number): string {
  const { destination, travelers, existingCards, categoryStats, realActivities } = context;

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
    ? `\nCurrent card distribution: ${categoryLines}. Aim for variety in categories not yet covered.`
    : "";

  // Road trip specific section
  const routeSection = destination.type === "roadtrip" && destination.waypoints?.length
    ? `\nROUTE STOPS: ${destination.waypoints.join(" → ")}\nInclude experiences for stops along the way.`
    : "";

  // Real activities section (unified JSON from Amadeus + Google Places)
  const hasRealActivities = !!realActivities;

  // Calculate how many real experiences to use vs local knowledge
  const minRealExperiences = Math.floor(cardCount * 0.65); // 65% minimum from real data
  const maxRealExperiences = Math.ceil(cardCount * 0.75); // 75% maximum from real data
  const localGemsCount = cardCount - minRealExperiences; // remaining for local gems

  const activitiesSection = hasRealActivities
    ? `
AVAILABLE_EXPERIENCES (unified JSON from Amadeus tours + Google Places):
\`\`\`json
${realActivities}
\`\`\`

EXPERIENCE FIELDS:
- source: "amadeus" (bookable tours) or "google_places" (restaurants, attractions)
- id: Copy to amadeusActivityId if source="amadeus"
- name, price, categories, bookingUrl, pictureUrl, address
`
    : "";

  const requirementsSection = hasRealActivities
    ? `REQUIREMENTS:
1. USE REAL EXPERIENCES FOR MAJORITY OF CARDS: Select ${minRealExperiences}-${maxRealExperiences} experiences from the AVAILABLE_EXPERIENCES JSON above.
   - source="amadeus": Bookable tours with real prices - COPY bookingUrl and id exactly
   - source="google_places": Restaurants/attractions - use for dining and local spots
   - IMPORTANT: Copy id to amadeusActivityId field, bookingUrl, and pictureUrl EXACTLY from the JSON
   - Browse through ALL the experiences in the JSON to find the best matches

2. SUPPLEMENT WITH LOCAL KNOWLEDGE: Add ${localGemsCount} free/cheap experiences NOT in the JSON:
   - Parks, beaches, viewpoints, street exploration
   - Street food, markets, local cafes
   - Use web search to find festivals/events happening during the travel dates
   - These make the trip feel authentic, not just tourist activities

3. MATCH TO TRAVELERS: Prioritize experiences matching their interests:
${travelerLines}
   - Ensure at least 2 experiences perfectly match the ⭐ GIFT RECIPIENT

4. BUDGET MIX: Ensure variety in pricing:
   - Include some free/cheap options (walks, parks, street food)
   - Include mid-range bookable experiences
   - 1-2 splurge options for special occasions

5. RARITY reflects uniqueness, NOT price:
   - common = popular, easy to book
   - uncommon = lesser-known but real
   - rare = requires timing or local knowledge
   - legendary = truly exceptional (use sparingly)`
    : `REQUIREMENTS:
1. BUDGET DIVERSITY (this is critical!):
   - 40% FREE experiences (parks, beaches, walks, viewpoints, street exploration)
   - 30% CHEAP experiences (under $20pp - street food, markets, local cafes)
   - 20% MODERATE experiences ($20-80pp - restaurants, museums, tours)
   - 10% SPLURGE experiences ($80+pp - fine dining, exclusive tours) - max 1 per batch

2. Each experience must be specific to ${destination.name} - real venues, actual activities

3. Match experiences to traveler interests - especially the gift recipient

4. Include a mix of:
   - Family-friendly activities everyone can enjoy
   - Age-appropriate experiences (kids activities for children)
   - Couple experiences for the adults
   - Use web search to find festivals/events happening during the travel dates

5. Rarity reflects uniqueness, NOT price:
   - common = easy to do, popular spots
   - uncommon = lesser-known local favorites
   - rare = requires timing or local knowledge
   - legendary = truly once-in-a-lifetime (use sparingly)`;

  return `Create ${cardCount} UNIQUE experience cards for this trip:

DESTINATION: ${destination.name}${destination.country ? `, ${destination.country}` : ""}
DATES: ${dateRange}
SEASON: ${season}
${routeSection}

TRAVELERS:
${travelerLines}
${activitiesSection}
${existingSection}
${categorySection}

${requirementsSection}

Return a JSON array with exactly this structure for each card:
[
  {
    "name": "Experience title (max 60 chars)",
    "description": "2-3 vivid sentences that make them excited to do this",
    "category": "food|wine|animals|art|nature|culture|adventure|family|spa|music",
    "targetProfile": "solo|couple|family|kids",
    "rarity": "common|uncommon|rare|legendary",
    "estimatedCost": "Local price + USD equivalent, e.g. 'R150 (~$8)' or 'Free'",
    "durationHours": number,
    "bookingMethod": "How to book/organize: 'Book via website', 'Reserve by phone', 'Just show up', 'Bring your own wine and blanket', etc.",
    "bookingUrl": "Direct URL to book or venue website, or null if just show up",
    "locationName": "Venue or spot name for the map pin",
    "locationAddress": "Full address or landmark description for Google Maps, e.g. 'Table Mountain, Cape Town, South Africa'",
    "amadeusActivityId": "ID from the real experiences list if selected from there, or null",
    "pictureUrl": "Image URL from the real experiences list if available, or null"
  }
]

Return ONLY the JSON array, no other text.`;
}

// System prompt for the AI
export const SYSTEM_PROMPT = `You are a local travel guide who knows destinations like a resident, not a tourist. You create experience cards that feel authentic and diverse - from free street discoveries to occasional splurges.

Your philosophy:
- MOST experiences should be affordable or free (local parks, street food, markets, beaches, walks)
- Some mid-range options (nice restaurants, day tours, museums)
- Only 1-2 splurge experiences per batch (fine dining, exclusive tours)
- Prioritize what locals actually do, not just tourist attractions

You know:
- The best cheap eats and street food spots
- Free activities: parks, viewpoints, neighborhoods to explore, street art
- Local markets, beaches, hiking trails
- Family-friendly spots that won't break the bank
- Where to go for a special occasion (but sparingly)

Be specific and practical:
- Use real venue names and locations
- For experiences from AVAILABLE_EXPERIENCES: Use the exact price.display value provided (already in local currency with USD)
- For your own original ideas: Estimate costs in LOCAL CURRENCY with USD equivalent: "R150 (~$8)", "€25 (~$27)", "Free"
- Many things should be under $20 or free
- Include practical tips locals would know
- Mix famous spots with hidden gems

WEB SEARCH: You can search the web to find seasonal events, festivals, or special happenings during the travel dates. Only use web search for time-sensitive local events - all other info comes from the provided JSON data.

Remember: The best travel memories often cost nothing, but when you recommend something paid, make sure it's real and bookable.`;

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
