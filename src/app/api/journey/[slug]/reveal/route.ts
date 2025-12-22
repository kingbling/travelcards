import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { cardId } = await request.json();

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

  // Get the card
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, is_revealed, chapter_id")
    .eq("id", cardId)
    .eq("status", "approved")
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Get chapter with cooldown info
  let chapter: { destination_id: string | null; reveal_cooldown_hours: number } | null = null;

  if (card.chapter_id) {
    const { data: chapterData } = await supabase
      .from("chapters")
      .select("destination_id, reveal_cooldown_hours")
      .eq("id", card.chapter_id)
      .single();
    chapter = chapterData;

    // Verify card belongs to this journey
    if (chapterData?.destination_id) {
      const { data: destination } = await supabase
        .from("destinations")
        .select("journey_id")
        .eq("id", chapterData.destination_id)
        .single();

      if (!destination || destination.journey_id !== journey.id) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }
    }
  }

  // Check if already revealed
  if (card.is_revealed) {
    return NextResponse.json({ error: "Card already revealed" }, { status: 400 });
  }

  // Check cooldown - get the last revealed card in this chapter
  if (chapter?.reveal_cooldown_hours) {
    const { data: lastReveal } = await supabase
      .from("cards")
      .select("revealed_at")
      .eq("chapter_id", card.chapter_id)
      .eq("is_revealed", true)
      .order("revealed_at", { ascending: false })
      .limit(1)
      .single();

    if (lastReveal?.revealed_at) {
      const lastRevealTime = new Date(lastReveal.revealed_at).getTime();
      const cooldownEnd = lastRevealTime + chapter.reveal_cooldown_hours * 60 * 60 * 1000;
      if (Date.now() < cooldownEnd) {
        return NextResponse.json(
          { error: "Cooldown active", cooldown_ends: new Date(cooldownEnd).toISOString() },
          { status: 429 }
        );
      }
    }
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
    return NextResponse.json({ error: "Failed to reveal card" }, { status: 500 });
  }

  // Create reveal record
  await supabase.from("reveals").insert({
    card_id: cardId,
    revealed_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
