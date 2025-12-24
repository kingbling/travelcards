import type { CardCategory, Rarity } from "@/types/database";
import { treatsLogger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface TravelerForTreat {
  name: string;
  age: number | null;
  interests: string[];
}

export interface DestinationForTreat {
  name: string;
  country: string | null;
  destination_type: string;
}

export interface TreatGenerationContext {
  journeyName: string;
  recipientName: string | null;
  recipientGender: "male" | "female" | "neutral"; // Inferred from name
  travelers: TravelerForTreat[];
  destination: DestinationForTreat; // Single destination for context-specific treats
  existingTreats: string[]; // Names for deduplication
}

export interface GeneratedTreat {
  name: string;
  description: string;
  category?: CardCategory;
  rarity?: Rarity;
  estimatedCost?: string | null;
  pictureUrl?: string | null;
}

// ============================================================================
// Gender Inference
// ============================================================================

/**
 * Infer gender from name using simple heuristics.
 * Note: This is a basic implementation for personalization purposes.
 */
export function inferGenderFromName(name: string | null): "male" | "female" | "neutral" {
  if (!name) return "neutral";

  const firstName = name.split(" ")[0].toLowerCase();

  // Common male names
  const maleNames = new Set([
    "john", "james", "robert", "michael", "william", "david", "richard", "joseph",
    "thomas", "charles", "christopher", "daniel", "matthew", "anthony", "mark",
    "donald", "steven", "paul", "andrew", "joshua", "kenneth", "kevin", "brian",
    "george", "edward", "ronald", "timothy", "jason", "jeffrey", "ryan", "jacob",
  ]);

  // Common female names
  const femaleNames = new Set([
    "mary", "patricia", "jennifer", "linda", "barbara", "elizabeth", "susan",
    "jessica", "sarah", "karen", "nancy", "lisa", "margaret", "betty", "sandra",
    "ashley", "dorothy", "kimberly", "emily", "donna", "michelle", "carol",
    "amanda", "melissa", "deborah", "stephanie", "rebecca", "laura", "sharon",
  ]);

  if (maleNames.has(firstName)) return "male";
  if (femaleNames.has(firstName)) return "female";
  return "neutral";
}

// ============================================================================
// Context Building
// ============================================================================

export function buildTreatContext(input: {
  journeyName: string;
  recipientName: string | null;
  participants: Array<{
    name: string;
    age: number | null;
    interests: string[] | null;
  }>;
  destination: {
    name: string;
    country: string | null;
    destination_type: string;
  };
}): TreatGenerationContext {
  return {
    journeyName: input.journeyName,
    recipientName: input.recipientName,
    recipientGender: inferGenderFromName(input.recipientName),
    travelers: input.participants.map((p) => ({
      name: p.name,
      age: p.age,
      interests: p.interests || [],
    })),
    destination: {
      name: input.destination.name,
      country: input.destination.country,
      destination_type: input.destination.destination_type,
    },
    existingTreats: [], // Could fetch from DB if needed for deduplication
  };
}

// ============================================================================
// Prompt Building
// ============================================================================

export function buildTreatPrompt(context: TreatGenerationContext, count: number): string {
  const travelersSection = context.travelers
    .map((t) => {
      const interestsStr = t.interests.length > 0 ? t.interests.join(", ") : "no specific interests";
      const ageStr = t.age ? `, ${t.age} years old` : "";
      return `- ${t.name}${ageStr}: ${interestsStr}`;
    })
    .join("\n");

  const countryContext = context.destination.country
    ? `${context.destination.name}, ${context.destination.country}`
    : context.destination.name;

  return `
JOURNEY: ${context.journeyName}
RECIPIENT: ${context.recipientName || "Traveler"}
DESTINATION: ${countryContext} (${context.destination.destination_type})

TRAVELERS:
${travelersSection}

TASK: Generate ${count} small, delightful treats specifically for ${countryContext}.

STEP 1 - ANALYZE TRAVELER INTERESTS:
First, think through what the travelers enjoy doing based on their interests listed above:
- What activities align with their hobbies/passions?
- What cultural experiences would they appreciate?
- What self-care or wellness activities suit their style?
- What culinary experiences match their food interests?
- Consider their ages and group dynamics

STEP 2 - GENERATE COUNTRY-SPECIFIC TREATS:
CRITICAL: ALL treats must be specific to ${context.destination.country || context.destination.name}.
DO NOT suggest generic treats like "get a massage" - make it country-specific like "Get a traditional ${context.destination.country} massage" or cuisine-specific like "Cook [local dish] yourself".

TREATS should be:
- Simple, doable activities that DON'T require advance booking
- 100% SPECIFIC to ${context.destination.country || context.destination.name} - mention the country/cuisine/culture explicitly in the treat name and description
- HIGHLY DIVERSE across multiple categories:
  * Wellness & Self-Care: massages, spa treatments, yoga, meditation spots
  * Culinary: cooking local dishes, trying breakfast specialties, market food tours, street food
  * Cultural: language learning, local customs, traditional crafts, festivals
  * Nature: hiking, beaches, parks, sunrise/sunset viewing, wildlife
  * Creative: photography walks, sketching, journaling, local art
  * Social: meeting locals, group activities, family moments
  * Adventure: trying new things, stepping outside comfort zone
  * Mindfulness: quiet reflection, gratitude, slowing down
  * Music & Arts: local performances, museums, galleries, street music
  * Sports & Active: local sports, dance classes, walking tours, cycling

Examples for ${context.destination.country || context.destination.name}:
  ${context.destination.country === "Thailand" ? `
  * "Get a traditional Thai massage at a local spa"
  * "Cook pad thai from scratch at your accommodation"
  * "Try khao man gai for breakfast at a street stall"
  * "Sample three different Thai street desserts"
  * "Learn to make Thai iced tea"` : context.destination.country === "Italy" ? `
  * "Get an Italian espresso at a local bar"
  * "Make fresh pasta from scratch"
  * "Try authentic Italian gelato from 3 different gelaterias"
  * "Learn basic Italian coffee ordering phrases"
  * "Buy fresh bread from a local panetteria"` : `
  * "Try the local breakfast specialty"
  * "Cook a traditional ${context.destination.country || "local"} dish yourself"
  * "Get a ${context.destination.country || "local"} massage/spa treatment"
  * "Sample local street food specific to this region"
  * "Learn basic phrases in the local language"`}

- AVOID: overly sentimental or cringy language, forced sentimentality, cheesy photo challenges
- Focus on: authentic experiences, self-care, food/cooking, cultural connection, active pursuits, creative expression
- Budget-friendly or FREE (60% free, 30% under $20, 10% under $50)
- Appropriate for all travelers in the group
- Ensure variety - don't repeat similar activities

PERSONALIZATION:
${context.recipientGender !== "neutral" ? `- Consider that the recipient is ${context.recipientGender}` : ""}
${context.travelers.some((t) => t.interests.length > 0) ? `- Incorporate traveler interests: ${context.travelers.flatMap((t) => t.interests).join(", ")}` : ""}
- EVERY treat MUST explicitly mention ${context.destination.country || context.destination.name} or specific local dishes/experiences from this destination
- Use actual dish names, local customs, and country-specific activities (e.g., "tonkotsu ramen" for Japan, "cacio e pepe" for Italy, "pho" for Vietnam)

TONE:
- Natural and straightforward language
- No excessive exclamation marks or emojis
- Genuine and practical, not forced or overly enthusiastic
- Treat these as real suggestions you'd give a friend

Return JSON array (${count} treats):
[
  {
    "name": "Short title (3-6 words)",
    "description": "2-3 sentences describing the treat and why it's special",
    "category": "food" | "wine" | "animals" | "art" | "nature" | "culture" | "adventure" | "family" | "spa" | "music",
    "rarity": "common" | "uncommon" | "rare" (most should be common or uncommon),
    "estimatedCost": "Free" | "$5" | "$10" etc.
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text.
`.trim();
}

// ============================================================================
// Response Parsing
// ============================================================================

export function parseTreatsResponse(response: string): GeneratedTreat[] {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonStr = response.trim();

    // Remove markdown code blocks
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n/, "").replace(/\n```\s*$/, "");
    }

    const treats = JSON.parse(jsonStr);

    if (!Array.isArray(treats)) {
      throw new Error("Response is not an array");
    }

    // Validate and normalize treats
    return treats.map((treat: any) => ({
      name: treat.name || "Unnamed Treat",
      description: treat.description || "",
      category: treat.category || "culture",
      rarity: treat.rarity || "common",
      estimatedCost: treat.estimatedCost || "Free",
      pictureUrl: treat.pictureUrl || null,
    }));
  } catch (error) {
    treatsLogger.error("Failed to parse treats response:", error);
    throw new Error("Failed to parse AI response as JSON");
  }
}
