import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyId } = await params;
    const supabase = await createClient();

    // 1. Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch journey with nested cards, verify ownership
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .select(`
        id,
        curator_id,
        destinations(
          id,
          cards(id)
        )
      `)
      .eq("id", journeyId)
      .eq("curator_id", user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // 3. Gather all card IDs for the journey
    const allCards = journey.destinations?.flatMap((d: {
      cards?: { id: string }[]
    }) => d.cards || []) || [];
    const cardIds = allCards.map((c) => c.id);

    if (cardIds.length === 0) {
      return NextResponse.json({
        error: "No cards to reset"
      }, { status: 400 });
    }

    console.log(`[RESET] Resetting journey ${journeyId} with ${cardIds.length} cards`);

    // 4. Use service client to bypass RLS for deleting reveals
    const serviceClient = createServiceClient();

    // Count reveals before deleting (for logging)
    const { count: revealCount } = await serviceClient
      .from("reveals")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journeyId);

    // 5. Delete ALL reveal records for this journey (by journey_id, not card_id)
    // This catches orphaned reveals from deleted cards too
    const { error: deleteError } = await serviceClient
      .from("reveals")
      .delete()
      .eq("journey_id", journeyId);

    if (deleteError) {
      console.error("[RESET] Failed to delete reveals:", deleteError);
      return NextResponse.json({
        error: "Failed to reset reveals"
      }, { status: 500 });
    }

    console.log(`[RESET] Deleted ${revealCount || 0} reveal records for journey ${journeyId}`);

    // 6. Calculate simple progressive reveal dates
    // Each card gets a reveal_date based on its position and reveals_per_week setting
    const { data: journeyData } = await supabase
      .from("journeys")
      .select("reveals_per_week, advance_reveal_days")
      .eq("id", journeyId)
      .single();

    const revealsPerWeek = journeyData?.reveals_per_week || 2;
    const advanceRevealDays = journeyData?.advance_reveal_days || 7;

    // Sort cards by order_index to assign progressive dates
    const sortedCardIds = [...cardIds];
    const { data: cardsData } = await supabase
      .from("cards")
      .select("id, order_index")
      .in("id", cardIds);

    if (cardsData) {
      sortedCardIds.sort((a, b) => {
        const cardA = cardsData.find(c => c.id === a);
        const cardB = cardsData.find(c => c.id === b);
        return (cardA?.order_index || 0) - (cardB?.order_index || 0);
      });
    }

    // Assign reveal dates: First revealsPerWeek cards get week 1, next revealsPerWeek get week 2, etc.
    const now = new Date();
    const updatePromises = sortedCardIds.map((cardId, index) => {
      const weekNumber = Math.floor(index / revealsPerWeek);
      const revealDate = new Date(now);
      revealDate.setDate(revealDate.getDate() + (weekNumber * 7));

      return supabase
        .from("cards")
        .update({
          is_revealed: false,
          revealed_at: null,
          reveal_date: revealDate.toISOString().split('T')[0],
        })
        .eq("id", cardId);
    });

    const results = await Promise.all(updatePromises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error("[RESET] Failed to update cards:", errors);
      return NextResponse.json({
        error: "Failed to update cards"
      }, { status: 500 });
    }

    // 7. Reset all treats for this journey
    const { count: treatsCount } = await serviceClient
      .from("treats")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journeyId)
      .eq("is_revealed", true);

    const { error: treatsError } = await serviceClient
      .from("treats")
      .update({
        is_revealed: false,
        revealed_at: null,
      })
      .eq("journey_id", journeyId);

    if (treatsError) {
      console.error("[RESET] Failed to reset treats:", treatsError);
      // Don't fail the whole operation, just log it
    }

    console.log(`[RESET] Successfully reset journey ${journeyId}, including ${treatsCount || 0} treats`);

    return NextResponse.json({
      success: true,
      stats: {
        cardsReset: cardIds.length,
        revealsCleared: revealCount || 0,
        treatsReset: treatsCount || 0,
      },
      message: `Reset complete! ${cardIds.length} cards, ${treatsCount || 0} treats reset`,
    });
  } catch (error) {
    console.error("[RESET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    );
  }
}
