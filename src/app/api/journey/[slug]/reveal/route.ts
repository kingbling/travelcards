import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";
import { canRevealCard, type RevealDenialReason } from "@/lib/api/reveal-quota";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { cardId } = await request.json();

  if (!cardId) {
    return NextResponse.json({ error: "Card ID required" }, { status: 400 });
  }

  const result = await verifyJourneyAccess(slug, "id, name, is_published, curator_id, reveals_per_week");
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    reveals_per_week?: number | null;
  };

  const supabase = await createClient();

  // Get the card with destination info
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, is_revealed, destination_id")
    .eq("id", cardId)
    .eq("status", "approved")
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Verify card belongs to this journey via destination
  let destinationId: string | null = null;
  if (card.destination_id) {
    const { data: destination } = await supabase
      .from("destinations")
      .select("journey_id, id")
      .eq("id", card.destination_id)
      .single();

    if (!destination || destination.journey_id !== journey.id) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    destinationId = destination.id;
  }

  // Validate reveal with simple weekly quota
  const validation = await canRevealCard(
    supabase,
    journey.id,
    cardId,
    journey.reveals_per_week ?? 2
  );

  if (!validation.allowed) {
    const errorMessages: Record<RevealDenialReason, string> = {
      already_revealed: "This card has already been revealed",
      quota_exceeded: "You've reached your weekly reveal limit",
      not_found: "Card not found",
    };

    return NextResponse.json(
      {
        error: validation.reason ? errorMessages[validation.reason] : "Cannot reveal card",
        reason: validation.reason,
      },
      { status: 400 }
    );
  }

  // Mark card as revealed
  const { error: updateError } = await supabase
    .from("cards")
    .update({
      is_revealed: true,
      revealed_at: new Date().toISOString(),
    })
    .eq("id", cardId);

  if (updateError) {
    return NextResponse.json(
      {
        error: "Failed to reveal card",
        details: updateError.message,
      },
      { status: 500 }
    );
  }

  // Create reveal record
  const { error: revealError } = await supabase.from("reveals").insert({
    card_id: cardId,
    journey_id: journey.id,
    revealed_at: new Date().toISOString(),
  });

  if (revealError) {
    // Continue anyway - card is already revealed
    console.error("[REVEAL] Failed to create reveal record:", revealError);
  }

  return NextResponse.json({
    success: true,
  });
}
