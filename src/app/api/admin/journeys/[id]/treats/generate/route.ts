import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildTreatPrompt, parseTreatsResponse, inferGenderFromName } from "@/lib/ai/generate-treats";
import type { TreatGenerationContext } from "@/lib/ai/generate-treats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic();

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

    // Get request body
    const body = await request.json();
    const treatCount = body.count || 5;
    const destinationId = body.destinationId || null;

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

    // Get destination for context - either selected one or first available
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

    // Build prompt
    const prompt = buildTreatPrompt(context, treatCount);

    console.log("[TREATS] Generating treats for journey:", journeyId);

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse treats
    const generatedTreats = parseTreatsResponse(textContent.text);

    console.log("[TREATS] Generated", generatedTreats.length, "treats");

    // Use service client to bypass RLS for inserts
    const serviceClient = createServiceClient();

    // Get max order_index
    const { data: existingTreats } = await serviceClient
      .from("treats")
      .select("order_index")
      .eq("journey_id", journeyId)
      .order("order_index", { ascending: false })
      .limit(1);

    const maxOrderIndex = existingTreats?.[0]?.order_index ?? -1;

    // Save treats to database
    const treatsToInsert = generatedTreats.map((treat, index) => ({
      journey_id: journeyId,
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
      console.error("[TREATS] Failed to save treats:", insertError);
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
    console.error("[TREATS] Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate treats" },
      { status: 500 }
    );
  }
}
