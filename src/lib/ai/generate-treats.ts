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
  destination: DestinationForTreat | null; // Null for global/journey-wide treats
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
  } | null;
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
    destination: input.destination ? {
      name: input.destination.name,
      country: input.destination.country,
      destination_type: input.destination.destination_type,
    } : null,
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

  const countryContext = context.destination
    ? (context.destination.country
      ? `${context.destination.name}, ${context.destination.country}`
      : context.destination.name)
    : null;

  const destinationLine = context.destination
    ? `DESTINATION: ${countryContext} (${context.destination.destination_type})`
    : `SCOPE: Journey-wide (not location-specific)`;

  return `
JOURNEY: ${context.journeyName}
RECIPIENT: ${context.recipientName || "Traveler"}
${destinationLine}

TRAVELERS:
${travelersSection}

TASK: Generate ${count} simple, spontaneous treats for this trip.

WHAT TREATS ARE:
Treats are small pleasures that take 10-60 minutes. They're NOT activities or excursions.
Think: things you'd do to treat yourself or your travel companions on a relaxed day.

GOOD EXAMPLES (written for the recipient):

For the main traveler (solo/adult time):
- "Get a massage while the kids are looked after"
- "Enjoy a quiet coffee alone at a café"
- "Take a solo sunset walk on the beach"
- "Receive breakfast in bed"
- "Have a glass of local wine in peace"

For the kids:
- "Get ice cream from a street vendor"
- "Have a movie night with local snacks"
- "Dance party in the room"
- "Paint or draw together"

For everyone together:
- "Have a family picnic with market food"
- "Try local street food together"
- "Sundowners on the beach (juice for kids, wine for adults)"
- "Cook a local meal together as a family"

Simple pampering:
- "Have a bath drawn for you with candles"
- "Get fresh pastries brought to your room"
- "Sleep in while someone else handles the kids"

${countryContext ? `Use your knowledge of ${countryContext} to make treats specific (e.g., mention actual local dishes, drinks, or customs where natural).` : `These treats should be universal and not tied to a specific location - think pleasures that work anywhere on the journey.`}

BAD EXAMPLES (these are activities, NOT treats):
- "Visit the penguin colony at Boulders Beach" (that's an excursion)
- "Hike Table Mountain" (half-day activity)
- "Explore the colorful Bo-Kaap neighborhood" (sightseeing)
- "Take a wine tour of Stellenbosch" (organized activity)
- "Learn traditional dance" (class/activity)

THE DIFFERENCE:
- Treats = simple pleasures you can do spontaneously in under an hour
- Activities = things that require planning, travel, or significant time

VARIETY:
Mix these types across your ${count} treats:
- Self-care: massage, bath, sleeping in, quiet time
- Food/drink: trying a local dish, buying wine, getting ice cream, cooking
- Simple moments: sunset with drinks, picnic, coffee break, beach time
- Little luxuries: room service, fresh flowers, local chocolates

${context.travelers.some((t) => t.interests.length > 0) ? `
PERSONALIZATION (subtle):
The travelers enjoy: ${context.travelers.flatMap((t) => t.interests).join(", ")}
Weave these interests naturally into some treats (e.g., if they like art, "sketch while having coffee").` : ""}

LOCAL FLAVOR (subtle, not forced):
You can mention local food/drink names where natural (e.g., "rooibos tea" in South Africa, "espresso" in Italy).
But don't make every treat about cultural education. Some can be universal pleasures enjoyed in a nice setting.

TONE:
- Casual, like suggestions from a friend
- No forced enthusiasm or exclamation marks
- Practical and genuine

Return JSON array (${count} treats):
[
  {
    "name": "Short title (3-6 words)",
    "description": "1-2 sentences, simple and direct",
    "category": "food" | "wine" | "animals" | "art" | "nature" | "culture" | "adventure" | "family" | "spa" | "music",
    "rarity": "common" | "uncommon" | "rare",
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
