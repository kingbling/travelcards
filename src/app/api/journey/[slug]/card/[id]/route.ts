import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id: cardId } = await params;
  const supabase = await createClient();

  // Verify journey exists and is published
  const { data: journey, error: journeyError } = await supabase
    .from("journeys")
    .select("id")
    .eq("unique_slug", slug)
    .eq("is_published", true)
    .single();

  if (journeyError || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

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
  if (card.chapter_id) {
    const { data: chapter } = await supabase
      .from("chapters")
      .select("destination_id")
      .eq("id", card.chapter_id)
      .single();

    if (chapter?.destination_id) {
      const { data: destination } = await supabase
        .from("destinations")
        .select("journey_id")
        .eq("id", chapter.destination_id)
        .single();

      if (!destination || destination.journey_id !== journey.id) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }
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
