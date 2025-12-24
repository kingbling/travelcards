import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { resetLogger } from "@/lib/logger";

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

    resetLogger.info(`Resetting journey ${journeyId} with ${cardIds.length} cards`);

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
      resetLogger.error("Failed to delete reveals:", deleteError);
      return NextResponse.json({
        error: "Failed to reset reveals"
      }, { status: 500 });
    }

    resetLogger.info(`Deleted ${revealCount || 0} reveal records for journey ${journeyId}`);

    // 6. Reset all cards - just clear is_revealed, no date assignments
    // All cards participate in the random raffle when revealing
    const { error: cardsError } = await serviceClient
      .from("cards")
      .update({
        is_revealed: false,
        revealed_at: null,
      })
      .in("id", cardIds);

    if (cardsError) {
      resetLogger.error("Failed to reset cards:", cardsError);
      return NextResponse.json({
        error: "Failed to reset cards"
      }, { status: 500 });
    }

    resetLogger.info(`Reset ${cardIds.length} cards to unrevealed state`);

    // 7. Delete all treat_reveals records for this journey
    const { count: treatRevealCount } = await serviceClient
      .from("treat_reveals")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journeyId);

    const { error: deleteTreatRevealsError } = await serviceClient
      .from("treat_reveals")
      .delete()
      .eq("journey_id", journeyId);

    if (deleteTreatRevealsError) {
      resetLogger.error("Failed to delete treat_reveals:", deleteTreatRevealsError);
      return NextResponse.json({
        error: "Failed to reset treat reveals"
      }, { status: 500 });
    }

    resetLogger.info(`Deleted ${treatRevealCount || 0} treat_reveal records for journey ${journeyId}`);

    // 8. Reset all treats for this journey
    const { count: treatsCount } = await serviceClient
      .from("treats")
      .select("id", { count: "exact" })
      .eq("journey_id", journeyId)
      .eq("is_revealed", true);

    resetLogger.info(`Found ${treatsCount || 0} revealed treats to reset`);

    if (treatsCount && treatsCount > 0) {
      const { error: treatsError, data: updatedTreats } = await serviceClient
        .from("treats")
        .update({
          is_revealed: false,
          revealed_at: null,
        })
        .eq("journey_id", journeyId)
        .eq("is_revealed", true)
        .select();

      if (treatsError) {
        resetLogger.error("Failed to reset treats:", treatsError);
        return NextResponse.json({
          error: "Failed to reset treats: " + treatsError.message
        }, { status: 500 });
      }

      resetLogger.info(`Reset ${updatedTreats?.length || 0} treats`);
    }

    resetLogger.info(`Successfully reset journey ${journeyId}`);

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
    resetLogger.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    );
  }
}
