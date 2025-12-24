import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildTreatPrompt, parseTreatsResponse, inferGenderFromName } from "@/lib/ai/generate-treats";
import type { TreatGenerationContext } from "@/lib/ai/generate-treats";
import { treatsLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const anthropic = new Anthropic();

// Cost per million tokens (Claude Sonnet with extended thinking)
const INPUT_COST_PER_MILLION = 3.0;
const OUTPUT_COST_PER_MILLION = 15.0;

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

    // Get destination for context
    let destination;
    if (destinationId) {
      destination = journey.destinations?.find((d: { id: string }) => d.id === destinationId);
      if (!destination) {
        return NextResponse.json({ error: "Destination not found" }, { status: 404 });
      }
    } else {
      destination = journey.destinations?.[0] || {
        name: "Travel destination",
        country: null,
        destination_type: "city",
      };
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
      destination: {
        name: destination.name,
        country: destination.country,
        destination_type: destination.destination_type || "city",
      },
      existingTreats: [],
    };

    const prompt = buildTreatPrompt(context, treatCount);

    treatsLogger.info(`Generating treats for journey: ${journeyId}, stream: ${stream}`);

    // If streaming, use SSE
    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Call Claude with extended thinking and streaming
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 16000,
              thinking: {
                type: "enabled",
                budget_tokens: 8000,
              },
              messages: [{ role: "user", content: prompt }],
              stream: true,
            });

            let thinkingContent = "";
            let textContent = "";
            let inputTokens = 0;
            let outputTokens = 0;

            for await (const event of response) {
              if (event.type === "content_block_delta") {
                const delta = event.delta;
                if ("thinking" in delta && delta.thinking) {
                  thinkingContent += delta.thinking;
                  // Stream thinking content
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: delta.thinking })}\n\n`)
                  );
                } else if ("text" in delta && delta.text) {
                  textContent += delta.text;
                }
              } else if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens;
              } else if (event.type === "message_start" && event.message.usage) {
                inputTokens = event.message.usage.input_tokens;
              }
            }

            // Parse the generated treats
            const generatedTreats = parseTreatsResponse(textContent);

            // Calculate usage
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
      model: "claude-sonnet-4-20250514",
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
