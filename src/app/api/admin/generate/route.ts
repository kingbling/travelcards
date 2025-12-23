import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildPrompt,
  parseGeneratedCards,
  isDuplicateCard,
  SYSTEM_PROMPT,
  type GenerationContext,
  type Traveler,
  type DestinationContext,
} from "@/lib/ai/generate-cards";

// Force dynamic to prevent caching for SSE
export const dynamic = "force-dynamic";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { journeyId, destinationId, cardCount = 8 } = await request.json();

    if (!journeyId) {
      return NextResponse.json({ error: "Journey ID required" }, { status: 400 });
    }

    // Fetch journey with all related data
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .select(`
        *,
        participants(*),
        destinations(
          *,
          waypoints(*),
          cards(name)
        )
      `)
      .eq("id", journeyId)
      .eq("curator_id", user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Get the specific destination or all destinations
    let targetDestination: DestinationContext;
    let existingCardNames: string[] = [];

    if (destinationId) {
      const dest = journey.destinations?.find((d: { id: string }) => d.id === destinationId);
      if (!dest) {
        return NextResponse.json({ error: "Destination not found" }, { status: 404 });
      }

      targetDestination = {
        id: dest.id,
        name: dest.name,
        country: dest.country,
        startDate: dest.start_date,
        endDate: dest.end_date,
        type: (dest.destination_type as "stay" | "roadtrip") || "stay",
        waypoints: dest.waypoints?.map((w: { name: string }) => w.name) || [],
      };

      existingCardNames = dest.cards?.map((c: { name: string }) => c.name) || [];
    } else {
      // Use first destination if none specified
      const dest = journey.destinations?.[0];
      if (!dest) {
        return NextResponse.json({ error: "No destinations found" }, { status: 400 });
      }

      targetDestination = {
        id: dest.id,
        name: dest.name,
        country: dest.country,
        startDate: dest.start_date,
        endDate: dest.end_date,
        type: (dest.destination_type as "stay" | "roadtrip") || "stay",
        waypoints: dest.waypoints?.map((w: { name: string }) => w.name) || [],
      };

      // Collect all existing cards across all destinations
      existingCardNames = journey.destinations?.flatMap(
        (d: { cards?: { name: string }[] }) => d.cards?.map((c: { name: string }) => c.name) || []
      ) || [];
    }

    // Build traveler context
    const travelers: Traveler[] = (journey.participants || []).map(
      (p: { name: string; age: number | null; role: string | null; interests: string[] | null; is_recipient: boolean | null }) => ({
        name: p.name,
        age: p.age,
        role: p.role,
        interests: p.interests || [],
        isRecipient: p.is_recipient ?? false,
      })
    );

    // Calculate category stats from existing cards
    const categoryStats: Record<string, number> = {};
    for (const dest of journey.destinations || []) {
      for (const card of dest.cards || []) {
        const cat = (card as { category?: string }).category || "unknown";
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
      }
    }

    // Build generation context
    const context: GenerationContext = {
      journeyName: journey.name,
      recipientName: journey.recipient_name,
      travelers,
      destination: targetDestination,
      existingCards: existingCardNames,
      categoryStats,
    };

    // Build the prompt
    const prompt = buildPrompt(context, cardCount);

    // Create SSE stream with real-time thinking
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event with prompt
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "init", prompt, destination: targetDestination })}\n\n`
          ));

          // Stream from Anthropic with extended thinking
          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 16000,
            thinking: {
              type: "enabled",
              budget_tokens: 10000,
            },
            system: SYSTEM_PROMPT,
            messages: [
              { role: "user", content: prompt }
            ],
          });

          let thinkingText = "";
          let responseText = "";

          // Stream events as they come
          for await (const event of stream) {
            if (event.type === "content_block_delta") {
              const delta = event.delta as { type: string; thinking?: string; text?: string };

              if (delta.type === "thinking_delta" && delta.thinking) {
                thinkingText += delta.thinking;
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: "thinking", content: delta.thinking })}\n\n`
                ));
              } else if (delta.type === "text_delta" && delta.text) {
                responseText += delta.text;
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: delta.text })}\n\n`
                ));
              }
            }
          }

          // Get final message for usage stats
          const finalMessage = await stream.finalMessage();

          // Parse the response
          const generatedCards = parseGeneratedCards(responseText);

          // Filter out duplicates
          const uniqueCards = generatedCards.filter(
            card => !isDuplicateCard(card.name, existingCardNames)
          );

          // Calculate cost
          const inputTokens = finalMessage.usage.input_tokens;
          const outputTokens = finalMessage.usage.output_tokens;
          const inputCost = (inputTokens / 1_000_000) * 3;
          const outputCost = (outputTokens / 1_000_000) * 15;
          const totalCost = inputCost + outputCost;

          // Send final result
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              cards: uniqueCards,
              thinking: thinkingText,
              stats: {
                requested: cardCount,
                generated: generatedCards.length,
                afterDedup: uniqueCards.length,
                existingCount: existingCardNames.length,
              },
              usage: {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                costUsd: totalCost,
              },
            })}\n\n`
          ));

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Generation failed" })}\n\n`
          ));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}

// Save generated cards to database
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { journeyId, destinationId, cards, prompt } = await request.json();

    if (!journeyId || !destinationId || !cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify journey ownership
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .select("id")
      .eq("id", journeyId)
      .eq("curator_id", user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Get current max order_index for this destination
    const { data: existingCards } = await supabase
      .from("cards")
      .select("order_index")
      .eq("destination_id", destinationId)
      .order("order_index", { ascending: false })
      .limit(1);

    let orderIndex = existingCards?.[0]?.order_index ?? -1;

    // Insert cards
    const cardInserts = cards.map((card: {
      name: string;
      description: string;
      category: string;
      targetProfile: string;
      rarity: string;
      estimatedCost: string | null;
      durationHours: number | null;
      bookingMethod: string | null;
      bookingUrl: string | null;
      locationName: string | null;
      locationAddress: string | null;
    }) => {
      orderIndex++;
      return {
        destination_id: destinationId,
        name: card.name,
        description: card.description,
        category: card.category,
        target_profile: card.targetProfile,
        rarity: card.rarity,
        estimated_cost: card.estimatedCost,
        duration_hours: card.durationHours,
        booking_method: card.bookingMethod,
        booking_url: card.bookingUrl,
        location_name: card.locationName,
        location_address: card.locationAddress,
        status: "draft",
        generation_prompt: prompt,
        order_index: orderIndex,
      };
    });

    const { data: insertedCards, error: insertError } = await supabase
      .from("cards")
      .insert(cardInserts)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to save cards" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      savedCount: insertedCards?.length || 0,
    });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 }
    );
  }
}
