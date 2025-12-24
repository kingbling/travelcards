import Anthropic from "@anthropic-ai/sdk";
import { AI_CONFIG } from "./config";

export interface WelcomeMessageContext {
  journeyName: string;
  recipientName: string;
  curatorName?: string;
  destinations: Array<{
    name: string;
    country: string | null;
    startDate: string | null;
    endDate: string | null;
  }>;
  totalCards: number;
}

/**
 * Generate a personalized welcome message for a journey
 * Explains the purpose of the gift with warmth and romance
 */
export async function generateWelcomeMessage(
  context: WelcomeMessageContext
): Promise<{ title: string; content: string }> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Format destinations nicely
  const destinationList = context.destinations
    .map((d) => {
      const location = d.country ? `${d.name}, ${d.country}` : d.name;
      if (d.startDate && d.endDate) {
        const start = new Date(d.startDate);
        const end = new Date(d.endDate);
        const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
        return `${location} (${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)})`;
      }
      return location;
    })
    .join("\n");

  const prompt = `You're helping someone create a romantic gift - a personalized journey of surprise experiences for their loved one.

JOURNEY DETAILS:
- Journey Name: ${context.journeyName}
- For: ${context.recipientName}
${context.curatorName ? `- From: ${context.curatorName}` : ""}
- Destinations:
${destinationList}
- Total Experiences: ${context.totalCards} cards

TASK: Write a warm, personal welcome message that explains WHY this gift exists.

TONE:
- Intimate and romantic (like a love letter)
- Warm but not overly sappy
- Exciting and anticipation-building
- Personal to ${context.recipientName}

WHAT TO INCLUDE:
- Why you created this for them
- What makes travel with them special
- The joy of discovering new experiences together
- How the card reveal system works (they unlock ${context.totalCards} experiences over time)
- Excitement for the journey ahead

WHAT TO AVOID:
- Generic travel platitudes
- Overly formal language
- Excessive emojis or exclamation marks
- Instructions or technical details
- Mentioning specific dates (they're already shown elsewhere)

FORMAT:
Return JSON with:
{
  "title": "A short, romantic title (max 6 words)",
  "content": "3-4 warm paragraphs (max 250 words total)"
}

The content should flow naturally, like you're speaking directly to ${context.recipientName}. Make it feel personal, thoughtful, and exciting.`;

  try {
    const response = await anthropic.messages.create({
      model: AI_CONFIG.MODEL,
      max_tokens: AI_CONFIG.MAX_TOKENS.WELCOME_MESSAGE,
      temperature: AI_CONFIG.TEMPERATURE.CREATIVE,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const result = JSON.parse(jsonMatch[0]) as { title: string; content: string };

    return {
      title: result.title.trim(),
      content: result.content.trim(),
    };
  } catch (error) {
    console.error("Failed to generate welcome message:", error);

    // Fallback to a nice default message
    return {
      title: `${context.recipientName}, Your Adventure Awaits`,
      content: `I've planned something special for our journey to ${context.destinations[0]?.name || "explore new places"}.\n\nEach of the ${context.totalCards} cards you'll discover is an experience I've chosen with you in mind - moments I hope we'll share, places that will take your breath away, and adventures that will become our stories.\n\nThe cards will reveal themselves over time, building anticipation for each surprise. I can't wait to see your reaction as you uncover what's waiting for us.\n\nHere's to new memories, spontaneous moments, and all the beautiful discoveries ahead.`,
    };
  }
}
