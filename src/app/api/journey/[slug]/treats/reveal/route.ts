import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";
import { canRevealTreat, type TreatRevealDenialReason } from "@/lib/api/treat-quota";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { treatId } = await request.json();

  if (!treatId) {
    return NextResponse.json({ error: "Treat ID required" }, { status: 400 });
  }

  const result = await verifyJourneyAccess(slug, "id, treats_per_week");
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    treats_per_week?: number | null;
  };

  const supabase = await createClient();

  // Validate reveal with treat quota system
  const validation = await canRevealTreat(
    supabase,
    journey.id,
    treatId,
    journey.treats_per_week ?? 1
  );

  if (!validation.allowed) {
    const errorMessages: Record<TreatRevealDenialReason, string> = {
      no_cards_revealed: "Reveal your first card to unlock treats!",
      already_revealed: "This treat has already been revealed",
      quota_exceeded: "You've reached your weekly treat limit",
      not_found: "Treat not found",
    };

    return NextResponse.json(
      {
        error: validation.reason ? errorMessages[validation.reason] : "Cannot reveal treat",
        reason: validation.reason,
      },
      { status: 400 }
    );
  }

  // Mark treat as revealed
  const { error: updateError } = await supabase
    .from("treats")
    .update({
      is_revealed: true,
      revealed_at: new Date().toISOString(),
    })
    .eq("id", treatId);

  if (updateError) {
    return NextResponse.json(
      {
        error: "Failed to reveal treat",
        details: updateError.message,
      },
      { status: 500 }
    );
  }

  // Create reveal record
  const { error: revealError } = await supabase.from("treat_reveals").insert({
    treat_id: treatId,
    journey_id: journey.id,
    revealed_at: new Date().toISOString(),
  });

  if (revealError) {
    // Continue anyway - treat is already revealed
    console.error("[TREAT REVEAL] Failed to create reveal record:", revealError);
  }

  return NextResponse.json({
    success: true,
  });
}
