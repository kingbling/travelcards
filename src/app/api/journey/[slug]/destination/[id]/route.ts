import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";
import { getCardsQuotaState } from "@/lib/api/reveal-quota";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id: destinationId } = await params;

  const result = await verifyJourneyAccess(slug, "id, name, is_published, curator_id, reveals_per_week");
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    name: string;
    reveals_per_week?: number | null;
  };

  const supabase = await createClient();

  // Get destination
  const { data: destination, error: destError } = await supabase
    .from("destinations")
    .select("id, name, country, start_date, end_date, theme_colors, journey_id")
    .eq("id", destinationId)
    .single();

  if (destError || !destination) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }

  // Verify destination belongs to this journey
  if (destination.journey_id !== journey.id) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }

  // Get approved cards for this destination
  const { data: cards } = await supabase
    .from("cards")
    .select(`
      id,
      name,
      description,
      category,
      rarity,
      is_revealed,
      picture_url,
      estimated_cost,
      duration_hours,
      order_index,
      reveal_date,
      experience_date
    `)
    .eq("destination_id", destinationId)
    .eq("status", "approved")
    .order("order_index", { ascending: true });

  // Get quota state for cards
  const cardsQuotaState = await getCardsQuotaState(
    supabase,
    journey.id,
    (cards || []).map((c) => ({
      id: c.id,
      is_revealed: c.is_revealed ?? false,
      reveal_date: c.reveal_date,
    }))
  );

  // Convert Map to object for JSON serialization
  const cardsQuotaStateObj: Record<string, any> = {};
  for (const [cardId, state] of cardsQuotaState.entries()) {
    cardsQuotaStateObj[cardId] = {
      isRevealed: state.isRevealed,
      canReveal: state.canReveal,
    };
  }

  // Get current quota status
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count: revealsThisWeek } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id)
    .gte("revealed_at", weekAgo.toISOString());

  const quotaLimit = journey.reveals_per_week || 2;
  const revealsRemaining = Math.max(0, quotaLimit - (revealsThisWeek || 0));

  // Get next destination in the journey (by start_date)
  const { data: nextDestination } = await supabase
    .from("destinations")
    .select("id, name, country, start_date, end_date")
    .eq("journey_id", journey.id)
    .neq("id", destinationId)
    .gt("start_date", destination.start_date || new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(1)
    .single();

  // Count cards for next destination if it exists
  let nextDestinationCardCount = 0;
  if (nextDestination) {
    const { count } = await supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("destination_id", nextDestination.id)
      .eq("status", "approved");
    nextDestinationCardCount = count || 0;
  }

  return NextResponse.json({
    ...destination,
    journey_name: journey.name,
    cards: cards || [],
    cardsQuotaState: cardsQuotaStateObj,
    quotaInfo: {
      revealsPerWeek: quotaLimit,
      revealsThisWeek: revealsThisWeek || 0,
      revealsRemaining,
    },
    nextDestination: nextDestination
      ? {
          id: nextDestination.id,
          name: nextDestination.name,
          country: nextDestination.country,
          start_date: nextDestination.start_date,
          end_date: nextDestination.end_date,
          card_count: nextDestinationCardCount,
        }
      : null,
  });
}
