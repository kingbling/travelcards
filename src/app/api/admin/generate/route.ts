import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { AI_CONFIG } from "@/lib/ai/config";
import {
  buildPrompt,
  parseGeneratedCards,
  isDuplicateCard,
  SYSTEM_PROMPT,
  type GenerationContext,
  type Traveler,
  type DestinationContext,
} from "@/lib/ai/generate-cards";
import {
  searchActivities,
  convertAmadeusToUnified,
  getDestinationCoordinates,
  type UnifiedExperience,
} from "@/lib/amadeus/activities";
import {
  textSearchPlaces,
  convertPlacesToUnified,
  isGooglePlacesConfigured,
  type PlaceResult,
} from "@/lib/google/places";
import { amadeusLogger, googleLogger, aiLogger, apiLogger } from "@/lib/logger";

// Force dynamic to prevent caching for SSE
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  // Disable prompt caching to avoid cached errors
  defaultHeaders: {
    "anthropic-beta": "interleaved-thinking-2025-05-14",
  },
});

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

    // Request extra cards to account for potential duplicates and LLM counting errors
    // Target: 25% buffer (e.g., request 10 to get 8, request 25 to get 20)
    const requestedCount = Math.ceil(cardCount * 1.25);

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
          waypoints(*)
        )
      `)
      .eq("id", journeyId)
      .eq("curator_id", user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Get destination IDs for this journey
    const destinationIds = journey.destinations?.map((d: { id: string }) => d.id) || [];

    // Fetch only REVEALED cards to exclude from generation (unrevealed cards can be replaced)
    const { data: revealedCards } = await supabase
      .from("cards")
      .select("name, destination_id, category")
      .eq("status", "approved")
      .eq("is_revealed", true)
      .in("destination_id", destinationIds);

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

      // Only revealed cards for this destination
      existingCardNames = revealedCards
        ?.filter((c: { destination_id: string | null }) => c.destination_id === destinationId)
        .map((c: { name: string }) => c.name) || [];
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

      // All revealed cards across all destinations
      existingCardNames = revealedCards?.map((c: { name: string }) => c.name) || [];
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

    // Calculate category stats from revealed cards
    const categoryStats: Record<string, number> = {};
    for (const card of revealedCards || []) {
      const cat = card.category || "unknown";
      categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    }

    // Create SSE stream immediately so we can stream logs in real-time
    const readable = new ReadableStream({
      async start(controller) {
        // Helper to stream logs (both to client and server console)
        const streamLog = (level: string, source: string, message: string) => {
          const logEntry = {
            timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
            level,
            source,
            message,
          };
          // Send to client
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "log", log: logEntry })}\n\n`
          ));
          // Also log to server console
          const fullMessage = `[${logEntry.timestamp}] ${level.toUpperCase().padEnd(5)} [${source}] ${message}`;
          if (level === "error") console.error(fullMessage);
          else if (level === "warn") console.warn(fullMessage);
          else console.log(fullMessage);
        };

        // Send heartbeat every 30 seconds to keep connection alive
        let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

        try {
          // Fetch real activities from Amadeus and Google Places
          const allExperiences: UnifiedExperience[] = [];
          const amadeusExperiences: UnifiedExperience[] = [];
          const googlePlacesExperiences: UnifiedExperience[] = [];
          let amadeusCount = 0;
          let googlePlacesCount = 0;

          streamLog("info", "GEOCODE", `Looking up coordinates for ${targetDestination.name}`);
          const coords = await getDestinationCoordinates(
            targetDestination.name,
            targetDestination.country
          );

          if (coords) {
            streamLog("info", "GEOCODE", `Found: ${coords.latitude}, ${coords.longitude}`);

            // Try Amadeus first
            streamLog("info", "AMADEUS", `Searching activities within 20km radius...`);
            try {
              const activities = await searchActivities(
                {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  radius: 20,
                },
                100
              );

              if (activities.length > 0) {
                const unifiedAmadeus = convertAmadeusToUnified(activities);
                amadeusExperiences.push(...unifiedAmadeus);
                allExperiences.push(...unifiedAmadeus);
                amadeusCount = unifiedAmadeus.length;
                streamLog("info", "AMADEUS", `Found ${amadeusCount} bookable tours/activities`);
              } else {
                streamLog("warn", "AMADEUS", "No activities found in this area");
              }
            } catch (error) {
              streamLog("error", "AMADEUS", `Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            }

            // Also fetch Google Places
            if (isGooglePlacesConfigured()) {
              streamLog("info", "GOOGLE", `Starting Google Places search...`);
              try {
                const searchQueries = [
                  `best restaurants ${targetDestination.name}`,
                  `things to do ${targetDestination.name}`,
                  `attractions ${targetDestination.name}`,
                  `museums ${targetDestination.name}`,
                  `art galleries ${targetDestination.name}`,
                  `family activities ${targetDestination.name}`,
                  `cafes ${targetDestination.name}`,
                  `parks ${targetDestination.name}`,
                  `beaches ${targetDestination.name}`,
                  `shopping ${targetDestination.name}`,
                ];

                const allPlaces = [];
                for (const query of searchQueries) {
                  try {
                    const places = await textSearchPlaces(query, coords.latitude, coords.longitude);
                    streamLog("debug", "GOOGLE", `"${query.replace(targetDestination.name, '...')}" → ${places.length} results`);
                    allPlaces.push(...places);
                  } catch (queryError) {
                    streamLog("error", "GOOGLE", `Query failed: ${query}`);
                  }
                }

                // Dedupe by placeId and limit to 100
                const uniquePlaces = Array.from(
                  new Map(allPlaces.map(p => [p.placeId, p])).values()
                );
                const limitedPlaces = uniquePlaces.slice(0, 100);
                streamLog("info", "GOOGLE", `${allPlaces.length} raw → ${uniquePlaces.length} unique → ${limitedPlaces.length} limited`);

                if (limitedPlaces.length > 0) {
                  const unifiedPlaces = await convertPlacesToUnified(limitedPlaces, targetDestination.country);
                  googlePlacesExperiences.push(...unifiedPlaces);
                  allExperiences.push(...unifiedPlaces);
                  googlePlacesCount = unifiedPlaces.length;
                  streamLog("info", "GOOGLE", `Found ${googlePlacesCount} places (restaurants, attractions, etc.)`);
                } else {
                  streamLog("warn", "GOOGLE", "No places found after processing");
                }
              } catch (error) {
                streamLog("error", "GOOGLE", `Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
              }
            } else {
              streamLog("warn", "GOOGLE", "API not configured - skipping");
            }
          } else {
            streamLog("warn", "GEOCODE", `No coordinates found for ${targetDestination.name} - using AI knowledge only`);
          }

          // Strip experiences to essential fields for AI (reduces token usage)
          const slimExperiences = allExperiences.map(exp => ({
            source: exp.source,
            id: exp.id,
            name: exp.name,
            price: exp.price.display,
            categories: exp.categories,
            bookingUrl: exp.bookingUrl,
            pictureUrl: exp.pictureUrl,
            address: exp.location.address,
          }));

          // Format as slim JSON for AI prompt
          const combinedExternalData = slimExperiences.length > 0
            ? JSON.stringify(slimExperiences, null, 2)
            : undefined;

          // Build generation context
          const context: GenerationContext = {
            journeyName: journey.name,
            recipientName: journey.recipient_name,
            travelers,
            destination: targetDestination,
            existingCards: existingCardNames,
            categoryStats,
            realActivities: combinedExternalData || undefined,
          };

          // Build the prompt (request extra to account for deduplication)
          streamLog("info", "AI", `Building prompt for ${requestedCount} cards (target: ${cardCount})`);
          const prompt = buildPrompt(context, requestedCount);
          streamLog("info", "AI", `Prompt ready: ${prompt.length} chars, ${allExperiences.length} experiences`);

          // Send init event with research data
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: "init",
              prompt,
              destination: targetDestination,
              hasRealActivities: !!combinedExternalData,
              amadeusCount,
              googlePlacesCount,
              researchData: {
                amadeus: amadeusExperiences,
                googlePlaces: googlePlacesExperiences,
                combined: allExperiences,
              },
            })}\n\n`
          ));

          streamLog("info", "AI", `Calling Claude ${AI_CONFIG.MODEL}...`);

          heartbeatInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`
              ));
            } catch {
              // Controller closed, stop heartbeat
              if (heartbeatInterval) clearInterval(heartbeatInterval);
            }
          }, 30000);

          try {
          // Stream from Anthropic with extended thinking and web search (for seasonal events only)
          const stream = anthropic.messages.stream({
            model: AI_CONFIG.MODEL,
            max_tokens: AI_CONFIG.MAX_TOKENS.CARD_GENERATION,
            thinking: {
              type: "enabled",
              budget_tokens: 10000,
            },
            tools: [
              {
                type: "web_search_20250305",
                name: "web_search",
                max_uses: 5,
              },
            ],
            system: SYSTEM_PROMPT,
            messages: [
              { role: "user", content: prompt }
            ],
          });

          let thinkingText = "";
          let responseText = "";
          let webSearchCount = 0;
          let eventCount = 0;
          let lastEventTime = Date.now();
          let lastProgressUpdate = Date.now();
          let currentPhase = "starting";

          // Stream events as they come
          console.log("[STREAM] Starting to iterate over AI events...");
          for await (const event of stream) {
            eventCount++;
            const now = Date.now();
            const timeSinceLast = now - lastEventTime;
            lastEventTime = now;

            // Log event types for debugging (every 50 events or if gap > 5s)
            if (eventCount % 50 === 0 || timeSinceLast > 5000) {
              console.log(`[STREAM] Event #${eventCount}: ${event.type} (${timeSinceLast}ms since last)`);
            }

            if (event.type === "content_block_start") {
              const block = event.content_block as { type: string; name?: string };
              console.log(`[STREAM] Content block start: ${block.type}${block.name ? ` (${block.name})` : ""}`);
              if (block.type === "server_tool_use" && block.name === "web_search") {
                webSearchCount++;
                currentPhase = "web_search";
                streamLog("info", "AI", `Web search #${webSearchCount} started...`);
              } else if (block.type === "web_search_tool_result") {
                streamLog("info", "AI", `Web search #${webSearchCount} completed`);
              } else if (block.type === "thinking") {
                currentPhase = "thinking";
                streamLog("info", "AI", "Thinking...");
              } else if (block.type === "text") {
                currentPhase = "generating";
                streamLog("info", "AI", "Generating cards...");
              }
            } else if (event.type === "content_block_stop") {
              console.log(`[STREAM] Content block stop`);
              if (currentPhase === "thinking") {
                streamLog("info", "AI", "Thinking complete");
              }
            } else if (event.type === "content_block_delta") {
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

                // Send progress update every 3 seconds during text generation
                if (now - lastProgressUpdate > 3000) {
                  const approxChars = responseText.length;
                  streamLog("debug", "AI", `Generating... (${Math.round(approxChars / 1000)}k chars)`);
                  lastProgressUpdate = now;
                }
              }
            } else if (event.type === "message_stop") {
              console.log(`[STREAM] Message stop received after ${eventCount} events`);
              streamLog("info", "AI", "Response complete");
            }
          }
          console.log(`[STREAM] AI stream finished after ${eventCount} events`);

          streamLog("info", "AI", `Generation complete. Parsing response...`);
          console.log("[STREAM] AI stream done, getting final message...");

          // Get final message for usage stats
          const finalMessage = await stream.finalMessage();
          console.log("[STREAM] Got final message, parsing cards...");

          // Parse the response
          const generatedCards = parseGeneratedCards(responseText);
          streamLog("info", "AI", `Parsed ${generatedCards.length} cards from response`);
          console.log(`[STREAM] Parsed ${generatedCards.length} cards`);

          // Filter out duplicates in two passes:
          // 1. Remove cards that match existing revealed cards
          // 2. Remove duplicates within the generated batch itself
          const seenNames: string[] = [...existingCardNames];
          const uniqueCards = generatedCards.filter(card => {
            if (isDuplicateCard(card.name, seenNames)) {
              streamLog("debug", "DEDUP", `Removed duplicate: ${card.name}`);
              return false;
            }
            seenNames.push(card.name);
            return true;
          });

          // Limit to the user's requested count
          const finalCards = uniqueCards.slice(0, cardCount);
          if (generatedCards.length !== finalCards.length) {
            streamLog("info", "AI", `Deduplication: ${generatedCards.length} → ${uniqueCards.length} → ${finalCards.length} cards`);
          }

          // Calculate cost
          const inputTokens = finalMessage.usage.input_tokens;
          const outputTokens = finalMessage.usage.output_tokens;
          const inputCost = (inputTokens / 1_000_000) * 3;
          const outputCost = (outputTokens / 1_000_000) * 15;
          const totalCost = inputCost + outputCost;

          // Count cards from real experiences
          const cardsFromAmadeus = finalCards.filter(c => c.amadeusActivityId).length;

          // Send final result
          console.log(`[STREAM] Sending complete event with ${finalCards.length} cards...`);
          const completeEvent = {
            type: "complete",
            cards: finalCards,
            thinking: thinkingText,
            stats: {
              requested: cardCount,
              actuallyRequested: requestedCount,
              generated: generatedCards.length,
              afterDedup: uniqueCards.length,
              final: finalCards.length,
              existingCount: existingCardNames.length,
              fromRealExperiences: cardsFromAmadeus,
              hasRealActivities: !!combinedExternalData,
              amadeusCount,
              googlePlacesCount,
            },
            usage: {
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              costUsd: totalCost,
            },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`));
          console.log("[STREAM] Complete event sent!");
          } finally {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            console.log("[STREAM] Heartbeat cleared");
          }

          console.log("[STREAM] Closing controller...");
          controller.close();
          console.log("[STREAM] Controller closed!");
        } catch (error) {
          console.error("[STREAM] Error caught:", error);
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          aiLogger.error("Stream error:", error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Generation failed" })}\n\n`
          ));
          controller.close();
          console.log("[STREAM] Controller closed after error");
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
    aiLogger.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}

// Enrich a card with Google Places data (coordinates and place ID)
async function enrichCardWithPlaceData(
  card: {
    locationName: string | null;
    locationAddress: string | null;
  },
  destinationName: string
): Promise<{
  location_lat: number | null;
  location_lng: number | null;
  google_place_id: string | null;
}> {
  if (!card.locationName || !isGooglePlacesConfigured()) {
    return { location_lat: null, location_lng: null, google_place_id: null };
  }

  try {
    // Search for the specific location
    const searchQuery = card.locationAddress
      ? `${card.locationName}, ${card.locationAddress}`
      : `${card.locationName}, ${destinationName}`;

    const places = await textSearchPlaces(searchQuery);

    if (places.length > 0) {
      // Use the top result
      const place = places[0] as PlaceResult;
      return {
        location_lat: place.location.latitude,
        location_lng: place.location.longitude,
        google_place_id: place.placeId,
      };
    }
  } catch (error) {
    googleLogger.warn(`Failed to enrich location for ${card.locationName}:`, error);
  }

  return { location_lat: null, location_lng: null, google_place_id: null };
}

// Save generated cards to database
export async function PUT(request: Request) {
  console.log("[SAVE] Starting card save...");

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("[SAVE] Unauthorized - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { journeyId, destinationId, cards, prompt } = await request.json();
    console.log(`[SAVE] Saving ${cards?.length || 0} cards to destination ${destinationId}`);

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

    // Get destination name for enrichment
    const { data: destination } = await supabase
      .from("destinations")
      .select("name")
      .eq("id", destinationId)
      .single();

    const destinationName = destination?.name || "";

    // Get current max order_index for this destination
    const { data: existingCards } = await supabase
      .from("cards")
      .select("order_index")
      .eq("destination_id", destinationId)
      .order("order_index", { ascending: false })
      .limit(1);

    const startOrderIndex = (existingCards?.[0]?.order_index ?? -1) + 1;

    // Enrich and prepare cards for insert
    const cardInserts = await Promise.all(
      cards.map(async (card: {
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
      }, index: number) => {
        // Enrich with Google Places data
        const placeData = await enrichCardWithPlaceData(card, destinationName);

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
          location_lat: placeData.location_lat,
          location_lng: placeData.location_lng,
          google_place_id: placeData.google_place_id,
          status: "approved",
          generation_prompt: prompt,
          order_index: startOrderIndex + index,
        };
      })
    );

    const { data: insertedCards, error: insertError } = await supabase
      .from("cards")
      .insert(cardInserts)
      .select();

    if (insertError) {
      console.error("[SAVE] Insert error:", insertError);
      apiLogger.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to save cards" }, { status: 500 });
    }

    console.log(`[SAVE] Successfully saved ${insertedCards?.length || 0} cards`);
    return NextResponse.json({
      success: true,
      savedCount: insertedCards?.length || 0,
    });
  } catch (error) {
    console.error("[SAVE] Error:", error);
    apiLogger.error("Save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 }
    );
  }
}
