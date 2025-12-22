import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { cardId, note, rating } = await request.json();

  if (!cardId) {
    return NextResponse.json({ error: "Card ID required" }, { status: 400 });
  }

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

  // Verify card exists and is revealed
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, chapter_id")
    .eq("id", cardId)
    .eq("is_revealed", true)
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Verify card belongs to this journey
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

  // Check if memory already exists
  const { data: existingMemory } = await supabase
    .from("memories")
    .select("id")
    .eq("card_id", cardId)
    .single();

  if (existingMemory) {
    // Update existing memory
    const { error: updateError } = await supabase
      .from("memories")
      .update({
        note: note || null,
        rating: rating || null,
        completed_at: new Date().toISOString().split("T")[0],
      })
      .eq("id", existingMemory.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
    }
  } else {
    // Create new memory
    const { error: insertError } = await supabase.from("memories").insert({
      card_id: cardId,
      note: note || null,
      rating: rating || null,
      completed_at: new Date().toISOString().split("T")[0],
    });

    if (insertError) {
      return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
