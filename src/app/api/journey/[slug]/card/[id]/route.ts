import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id: cardId } = await params;

  const result = await verifyJourneyAccess(slug);
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const supabase = await createClient();

  // Get card
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .eq("status", "approved")
    .eq("is_revealed", true)
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Verify card belongs to this journey by checking the destination
  if (card.destination_id) {
    const { data: destination } = await supabase
      .from("destinations")
      .select("journey_id")
      .eq("id", card.destination_id)
      .single();

    if (!destination || destination.journey_id !== result.journey.id) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
  }

  // Get memory if exists
  const { data: memory } = await supabase
    .from("memories")
    .select("*")
    .eq("card_id", cardId)
    .single();

  return NextResponse.json({
    ...card,
    memory: memory || null,
  });
}
