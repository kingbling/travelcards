import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateNoteTemplate, type NoteTemplateContext } from "@/lib/ai/generate-note-template";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: journeyId } = await params;
  const { displayOn, destinationId, cardId, coreMessage } = await request.json() as {
    displayOn: "intro" | "destination_start" | "chapter_start" | "card_reveal";
    destinationId?: string;
    cardId?: string;
    coreMessage?: string;
  };

  const supabase = await createClient();

  // Verify user owns this journey
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: journey, error: journeyError } = await supabase
    .from("journeys")
    .select("curator_id, name, recipient_name")
    .eq("id", journeyId)
    .single();

  if (journeyError || !journey || journey.curator_id !== user.id) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // Get curator name (optional)
  let curatorName: string | undefined;
  const { data: curatorData } = await supabase
    .from("participants")
    .select("name")
    .eq("journey_id", journeyId)
    .eq("is_recipient", false)
    .limit(1)
    .single();
  curatorName = curatorData?.name || undefined;

  // Build context
  const context: NoteTemplateContext = {
    journeyName: journey.name,
    recipientName: journey.recipient_name || "Friend",
    curatorName,
    displayOn,
  };

  // Add destination context if needed
  if (displayOn === "destination_start" && destinationId) {
    const { data: destination } = await supabase
      .from("destinations")
      .select("name, country")
      .eq("id", destinationId)
      .single();

    if (destination) {
      context.destinationName = destination.name;
      context.destinationCountry = destination.country || undefined;
    }
  }

  // Add card context if needed
  if (displayOn === "card_reveal" && cardId) {
    const { data: card } = await supabase
      .from("cards")
      .select("name, category")
      .eq("id", cardId)
      .single();

    if (card) {
      context.cardName = card.name;
      context.cardCategory = card.category || undefined;
    }
  }

  try {
    console.log("[GENERATE-NOTE] Generating template with context:", { displayOn, hasCoreMessage: !!coreMessage });
    const result = await generateNoteTemplate(context, coreMessage);
    console.log("[GENERATE-NOTE] Generated:", {
      title: result.title,
      contentLength: result.content.length,
      usedFallback: result.usedFallback
    });

    // Pass through all fields including fallback indicator
    return NextResponse.json({
      title: result.title,
      content: result.content,
      usedFallback: result.usedFallback,
      fallbackReason: result.fallbackReason,
    });
  } catch (error) {
    // This should rarely happen now since generateNoteTemplate handles its own fallbacks
    console.error("[GENERATE-NOTE] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
