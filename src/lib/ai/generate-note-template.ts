import Anthropic from "@anthropic-ai/sdk";
import { AI_CONFIG } from "./config";

export interface NoteTemplateContext {
  journeyName: string;
  recipientName: string;
  curatorName?: string;
  displayOn: "intro" | "destination_start" | "chapter_start" | "card_reveal";
  destinationName?: string; // For destination_start
  destinationCountry?: string;
  cardName?: string; // For card_reveal
  cardCategory?: string;
}

/**
 * Generate a personalized note template based on context
 * Returns pre-filled title and content that the curator can edit
 */
export async function generateNoteTemplate(
  context: NoteTemplateContext,
  coreMessage?: string
): Promise<{ title: string; content: string; usedFallback: boolean; fallbackReason?: string }> {
  console.log("[AI] ========== STARTING GENERATION ==========");
  console.log("[AI] Display type:", context.displayOn);
  console.log("[AI] Core message:", coreMessage || "(empty)");
  console.log("[AI] Recipient:", context.recipientName);

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let promptContext = "";
  let examples = "";

  switch (context.displayOn) {
    case "intro":
      promptContext = `This note appears when ${context.recipientName} first opens the journey. It should explain WHY you created this gift.`;
      examples = `Example titles: "Adventures Written for You", "Our Journey Begins", "A Gift of Discovery"`;
      break;

    case "destination_start":
      promptContext = `This note appears when ${context.recipientName} enters ${context.destinationName}${context.destinationCountry ? `, ${context.destinationCountry}` : ""}. Share your excitement about this place.`;
      examples = `Example titles: "Welcome to ${context.destinationName}", "We're Finally Here!", "This Place Changed Me"`;
      break;

    case "chapter_start":
      promptContext = `This note appears at the start of a new chapter in the journey. Mark a transition or theme.`;
      examples = `Example titles: "A New Adventure", "The Next Chapter", "Something Different"`;
      break;

    case "card_reveal":
      promptContext = `This note appears when ${context.recipientName} reveals a specific card${context.cardName ? ` (${context.cardName})` : ""}. Add context about why this experience is special.`;
      examples = `Example titles: "I've Been Dreaming of This", "A Little Secret", "Trust Me On This One"`;
      break;
  }

  const coreMessageSection = coreMessage
    ? `
CORE MESSAGE FROM CURATOR:
"${coreMessage}"

CRITICAL: Your note MUST be based on this core message. Expand it, add warmth and detail, but keep the curator's original sentiment and intention intact.`
    : "";

  const prompt = `You're helping someone write a romantic personal note for their travel companion.

CONTEXT:
- Journey Name: ${context.journeyName}
- For: ${context.recipientName}
${context.curatorName ? `- From: ${context.curatorName}` : ""}
- Display Location: ${context.displayOn}
- ${promptContext}
${coreMessageSection}

TASK: ${coreMessage ? "Expand the curator's core message into a warm, personal note." : "Write a warm, personal note template that the curator can use as a starting point."}

TONE:
- Intimate and personal (second person "you")
- Warm but not overly sappy
- Specific to this moment in the journey
- Conversational, like you're speaking to them

REQUIREMENTS:
- Keep it SHORT: 2-3 sentences max (50-80 words)
- ${coreMessage ? "PRESERVE the curator's core message and sentiment" : "Make it feel personal and authentic"}
- Include details that make it feel real (not generic)
- ${coreMessage ? "Enhance and beautify their words without changing the meaning" : "Leave room for the curator to add their own touches"}

${examples}

FORMAT:
Return JSON with:
{
  "title": "Short, personal title (max 6 words)",
  "content": "2-3 warm sentences (50-80 words)"
}`;

  try {
    console.log("[AI] Calling Anthropic API for note template...");
    const response = await anthropic.messages.create({
      model: AI_CONFIG.MODEL,
      max_tokens: AI_CONFIG.MAX_TOKENS.NOTE_TEMPLATE,
      temperature: AI_CONFIG.TEMPERATURE.CREATIVE,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    console.log("[AI] Received response from Anthropic");
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI] Could not find JSON in response:", content.text);
      throw new Error("Could not parse AI response as JSON");
    }

    const result = JSON.parse(jsonMatch[0]) as { title: string; content: string };
    console.log("[AI] Successfully parsed AI response");

    return {
      title: result.title.trim(),
      content: result.content.trim(),
      usedFallback: false,
    };
  } catch (error) {
    console.error("[AI] ========== GENERATION FAILED ==========");
    console.error("[AI] Error details:", error);
    console.error("[AI] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[AI] API Key present:", !!process.env.ANTHROPIC_API_KEY);
    console.error("[AI] API Key length:", process.env.ANTHROPIC_API_KEY?.length || 0);
    console.error("[AI] Using fallback template");
    console.error("[AI] ========================================");

    // If core message exists, preserve it instead of using generic templates
    if (coreMessage && coreMessage.trim()) {
      console.log("[AI] Preserving user's core message in fallback");

      // Generate title from first 5-6 words of core message
      const words = coreMessage.trim().split(/\s+/).slice(0, 6);
      let title = words.join(' ').replace(/[.,!?]$/, '');
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);

      // Use core message as content with optional contextual prefix
      let content = coreMessage.trim();
      if (context.displayOn === 'destination_start' && context.destinationName) {
        content = `Welcome to ${context.destinationName}!\n\n${content}`;
      }

      return {
        title,
        content,
        usedFallback: true,
        fallbackReason: error instanceof Error ? error.message : 'AI generation failed'
      };
    }

    // Fallback templates for empty core message (generic templates)
    const fallbackReason = error instanceof Error ? error.message : 'AI generation failed';

    switch (context.displayOn) {
      case "intro":
        return {
          title: `${context.recipientName}, This is For You`,
          content: `I've been planning this for so long, imagining your face as you discover each surprise. Every experience here is chosen with you in mind. I can't wait to share these moments together.`,
          usedFallback: true,
          fallbackReason,
        };

      case "destination_start":
        return {
          title: `Welcome to ${context.destinationName || "Paradise"}`,
          content: `We're finally here! I've dreamed about exploring this place with you. Get ready for some incredible experiences - I think you're going to love what I've planned.`,
          usedFallback: true,
          fallbackReason,
        };

      case "chapter_start":
        return {
          title: "A New Chapter Begins",
          content: `Something different awaits. I hope you're ready for this next part of our adventure - it's going to be special.`,
          usedFallback: true,
          fallbackReason,
        };

      case "card_reveal":
        return {
          title: "I Can't Wait for This",
          content: `This experience is one I've been most excited about. ${context.cardName ? `${context.cardName} - ` : ""}Trust me, it's going to be amazing.`,
          usedFallback: true,
          fallbackReason,
        };
    }
  }
}
