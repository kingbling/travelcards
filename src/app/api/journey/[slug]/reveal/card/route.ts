import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

/**
 * Get the start of the current week (Monday at midnight UTC)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the next Monday at midnight UTC
 */
function getNextResetTime(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 1 ? 7 : ((8 - dayOfWeek) % 7) || 7;
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Optional: destinationId to limit selection to specific destination
  let destinationId: string | null = null;
  try {
    const body = await request.json();
    destinationId = body.destinationId || null;
  } catch {
    // No body or invalid JSON - that's fine
  }

  const result = await verifyJourneyAccess(
    slug,
    "id, is_published, curator_id, reveals_per_week"
  );
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    reveals_per_week?: number | null;
  };

  const supabase = await createClient();
  const serviceClient = createServiceClient(); // For updates that bypass RLS
  const weekStart = getWeekStart();
  const nextReset = getNextResetTime();

  // Default to journey-level quota
  let effectivePerWeek = journey.reveals_per_week ?? 2;

  // Get destination IDs and check for quota overrides
  let destinationIds: string[] = [];
  if (destinationId) {
    // Verify destination belongs to journey and get its quota overrides
    const { data: destData } = await supabase
      .from("destinations")
      .select("id, reveals_per_week")
      .eq("id", destinationId)
      .eq("journey_id", journey.id)
      .single();

    if (!destData) {
      return NextResponse.json(
        { error: "Destination not found", code: "not_found" },
        { status: 404 }
      );
    }
    destinationIds = [destinationId];

    // Cast to include quota fields and use destination override if set
    const dest = destData as typeof destData & { reveals_per_week?: number | null };
    effectivePerWeek = dest.reveals_per_week ?? journey.reveals_per_week ?? 2;
  } else {
    const { data: destinations } = await supabase
      .from("destinations")
      .select("id")
      .eq("journey_id", journey.id);
    destinationIds = destinations?.map((d) => d.id) || [];
  }

  if (destinationIds.length === 0) {
    return NextResponse.json(
      { error: "No destinations found", code: "no_destinations" },
      { status: 400 }
    );
  }

  // Count reveals this week for the destination context
  let revealsThisWeek = 0;
  if (destinationId) {
    // Count reveals for this specific destination by joining reveals -> cards
    const { data: revealsData } = await supabase
      .from("reveals")
      .select("id, cards!inner(destination_id)")
      .eq("journey_id", journey.id)
      .eq("cards.destination_id", destinationId)
      .gte("revealed_at", weekStart.toISOString());
    revealsThisWeek = revealsData?.length ?? 0;
  } else {
    // Journey-wide count
    const { count } = await supabase
      .from("reveals")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journey.id)
      .gte("revealed_at", weekStart.toISOString());
    revealsThisWeek = count ?? 0;
  }

  const remaining = Math.max(0, effectivePerWeek - revealsThisWeek);

  if (remaining === 0) {
    return NextResponse.json(
      {
        error: "Weekly quota reached",
        code: "quota_exceeded",
        nextResetTime: nextReset.toISOString(),
      },
      { status: 400 }
    );
  }

  // Get ALL unrevealed approved cards for the destination(s) - no date filtering
  // All cards participate in the random "raffle"
  const { data: availableCards } = await supabase
    .from("cards")
    .select("*")
    .eq("status", "approved")
    .eq("is_revealed", false)
    .in("destination_id", destinationIds);

  console.log(`[REVEAL/CARD] Available cards for raffle: ${availableCards?.length || 0}`);
  availableCards?.forEach((c, i) => {
    console.log(`[REVEAL/CARD]   ${i}: "${c.name}"`);
  });

  if (!availableCards || availableCards.length === 0) {
    return NextResponse.json(
      { error: "No cards available to reveal", code: "no_cards" },
      { status: 400 }
    );
  }

  // Random selection from available cards
  const randomIndex = Math.floor(Math.random() * availableCards.length);
  const selectedCard = availableCards[randomIndex];

  console.log(`[REVEAL/CARD] Random index: ${randomIndex} of ${availableCards.length}`);
  console.log(`[REVEAL/CARD] Selected: "${selectedCard.name}"`);

  // Mark as revealed (use service client to bypass RLS)
  const { error: updateError } = await serviceClient
    .from("cards")
    .update({ is_revealed: true, revealed_at: new Date().toISOString() })
    .eq("id", selectedCard.id);

  if (updateError) {
    console.error("[REVEAL/CARD] Failed to update card:", updateError);
    return NextResponse.json(
      { error: "Failed to reveal card", code: "update_failed" },
      { status: 500 }
    );
  }

  // Create reveal record (use service client to bypass RLS)
  const { error: revealError } = await serviceClient.from("reveals").insert({
    journey_id: journey.id,
    card_id: selectedCard.id,
    revealed_at: new Date().toISOString(),
  });

  if (revealError) {
    console.error("[REVEAL/CARD] Failed to create reveal record:", revealError);
    // Don't fail the request, card is already revealed
  }

  // Return the revealed card
  return NextResponse.json({
    type: "card",
    card: {
      id: selectedCard.id,
      name: selectedCard.name,
      description: selectedCard.description,
      category: selectedCard.category,
      rarity: selectedCard.rarity,
      picture_url: selectedCard.picture_url,
      estimated_cost: selectedCard.estimated_cost,
      duration_hours: selectedCard.duration_hours,
      experience_date: selectedCard.experience_date,
      destination_id: selectedCard.destination_id,
    },
    quota: {
      remaining: remaining - 1,
      perWeek: effectivePerWeek,
      nextResetTime: nextReset.toISOString(),
    },
  });
}
