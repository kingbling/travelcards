import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildTreatPrompt, parseTreatsResponse, inferGenderFromName } from "@/lib/ai/generate-treats";
import type { TreatGenerationContext } from "@/lib/ai/generate-treats";
import { treatsLogger } from "@/lib/logger";
import { AI_CONFIG } from "@/lib/ai/config";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const anthropic = new Anthropic();

// Cost per million tokens (Claude Sonnet 4.5 with extended thinking)
const INPUT_COST_PER_MILLION = 3.0;
const OUTPUT_COST_PER_MILLION = 15.0;

// Web search tool definition
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search" as const,
  max_uses: 2,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const treatCount = body.count || 5;
    const destinationId = body.destinationId || null;
    const stream = body.stream || false;

    // Fetch journey with destinations and participants
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .select(`
        id,
        name,
        recipient_name,
        curator_id,
        destinations(id, name, country, destination_type),
        participants(name, age, interests)
      `)
      .eq("id", journeyId)
      .eq("curator_id", user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Get destination for context (null for global treats)
    let destination = null;
    if (destinationId) {
      const foundDest = journey.destinations?.find((d: { id: string }) => d.id === destinationId);
      if (!foundDest) {
        return NextResponse.json({ error: "Destination not found" }, { status: 404 });
      }
      destination = foundDest;
    }

    // Build context for AI
    const context: TreatGenerationContext = {
      journeyName: journey.name,
      recipientName: journey.recipient_name,
      recipientGender: inferGenderFromName(journey.recipient_name),
      travelers: (journey.participants || []).map((p: { name: string; age: number | null; interests: string[] | null }) => ({
        name: p.name,
        age: p.age,
        interests: p.interests || [],
      })),
      destination: destination ? {
        name: destination.name,
        country: destination.country,
        destination_type: destination.destination_type || "city",
      } : null,
      existingTreats: [],
    };

    const prompt = buildTreatPrompt(context, treatCount);

    treatsLogger.info(`Generating treats for journey: ${journeyId}, stream: ${stream}`);

    // If streaming, use SSE
    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

          // Helper to send SSE log events
          const streamLog = (level: string, source: string, message: string) => {
            const timestamp = new Date().toISOString();
            treatsLogger.info(`[${source}] ${message}`);
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "log",
                  timestamp,
                  level,
                  source,
                  message
                })}\n\n`)
              );
            } catch {
              // Controller may be closed
            }
          };

          try {
            // Send init event with prompt
            const locationMsg = destination ? destination.name : "entire journey";
            streamLog("info", "TREATS", `Generating ${treatCount} treats for ${locationMsg}`);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: "init",
                prompt,
                destination: destination ? {
                  name: destination.name,
                  country: destination.country,
                } : null,
              })}\n\n`)
            );

            streamLog("info", "AI", `Calling Claude ${AI_CONFIG.MODEL} with web search...`);

            // Start heartbeat to keep connection alive
            heartbeatInterval = setInterval(() => {
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`)
                );
              } catch {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
              }
            }, 30000);

            // Call Claude with extended thinking, streaming, and web search
            const stream = anthropic.messages.stream({
              model: AI_CONFIG.MODEL,
              max_tokens: 16000,
              thinking: {
                type: "enabled",
                budget_tokens: 5000,
              },
              tools: [WEB_SEARCH_TOOL],
              messages: [{ role: "user", content: prompt }],
            });

            let textContent = "";

            stream.on("text", (text) => {
              textContent += text;
              // Stream output as it's generated
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "output", content: text })}\n\n`)
              );
            });

            // Process raw events for thinking
            for await (const event of stream) {
              if (event.type === "content_block_delta") {
                const delta = event.delta;
                if ("thinking" in delta && delta.thinking) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: delta.thinking })}\n\n`)
                  );
                }
              }
            }

            // Get final message for usage stats
            const finalMessage = await stream.finalMessage();

            // Clear heartbeat
            if (heartbeatInterval) clearInterval(heartbeatInterval);

            streamLog("info", "AI", `Generation complete. Parsing treats...`);

            // Parse the generated treats
            const generatedTreats = parseTreatsResponse(textContent);
            streamLog("info", "TREATS", `Parsed ${generatedTreats.length} treats`);

            // Calculate usage
            const inputTokens = finalMessage.usage.input_tokens;
            const outputTokens = finalMessage.usage.output_tokens;
            const totalTokens = inputTokens + outputTokens;
            const costUsd = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION +
                           (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

            // Send completion event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: "complete",
                treats: generatedTreats,
                usage: {
                  inputTokens,
                  outputTokens,
                  totalTokens,
                  costUsd,
                },
              })}\n\n`)
            );

            controller.close();
          } catch (error) {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            treatsLogger.error("Streaming error:", error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Generation failed",
              })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming response (fallback)
    const response = await anthropic.messages.create({
      model: AI_CONFIG.MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const generatedTreats = parseTreatsResponse(textContent.text);

    // Use service client to save treats
    const serviceClient = createServiceClient();

    const { data: existingTreats } = await serviceClient
      .from("treats")
      .select("order_index")
      .eq("journey_id", journeyId)
      .order("order_index", { ascending: false })
      .limit(1);

    const maxOrderIndex = existingTreats?.[0]?.order_index ?? -1;

    const treatsToInsert = generatedTreats.map((treat, index) => ({
      journey_id: journeyId,
      destination_id: destinationId,
      name: treat.name,
      description: treat.description,
      category: treat.category,
      rarity: treat.rarity,
      estimated_cost: treat.estimatedCost,
      picture_url: treat.pictureUrl,
      order_index: maxOrderIndex + 1 + index,
      is_revealed: false,
    }));

    const { data: savedTreats, error: insertError } = await serviceClient
      .from("treats")
      .insert(treatsToInsert)
      .select();

    if (insertError) {
      treatsLogger.error("Failed to save treats:", insertError);
      return NextResponse.json({ error: "Failed to save treats" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      treats: savedTreats,
      stats: {
        requested: treatCount,
        generated: generatedTreats.length,
        saved: savedTreats?.length || 0,
      },
    });
  } catch (error) {
    treatsLogger.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate treats" },
      { status: 500 }
    );
  }
}

// PUT endpoint to save selected treats
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const body = await request.json();
    const { destinationId, treats } = body;

    if (!treats || !Array.isArray(treats) || treats.length === 0) {
      return NextResponse.json({ error: "No treats to save" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Get max order_index
    const { data: existingTreats } = await serviceClient
      .from("treats")
      .select("order_index")
      .eq("journey_id", journeyId)
      .order("order_index", { ascending: false })
      .limit(1);

    const maxOrderIndex = existingTreats?.[0]?.order_index ?? -1;

    // Prepare treats for insertion
    const treatsToInsert = treats.map((treat: {
      name: string;
      description: string;
      category: string;
      rarity: string;
      estimatedCost: string | null;
      pictureUrl: string | null;
    }, index: number) => ({
      journey_id: journeyId,
      destination_id: destinationId || null,
      name: treat.name,
      description: treat.description,
      category: treat.category,
      rarity: treat.rarity,
      estimated_cost: treat.estimatedCost,
      picture_url: treat.pictureUrl,
      order_index: maxOrderIndex + 1 + index,
      is_revealed: false,
    }));

    const { data: savedTreats, error: insertError } = await serviceClient
      .from("treats")
      .insert(treatsToInsert)
      .select();

    if (insertError) {
      treatsLogger.error("Failed to save treats:", insertError);
      return NextResponse.json({ error: "Failed to save treats" }, { status: 500 });
    }

    treatsLogger.info(`Saved ${savedTreats?.length || 0} treats for journey: ${journeyId}`);

    return NextResponse.json({
      success: true,
      saved: savedTreats?.length || 0,
    });
  } catch (error) {
    treatsLogger.error("Save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save treats" },
      { status: 500 }
    );
  }
}
