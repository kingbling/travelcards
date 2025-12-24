import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  // Optional: destinationId to limit selection to specific destination's treats
  let destinationId: string | null = null;
  try {
    const body = await request.json();
    destinationId = body.destinationId || null;
  } catch {
    // No body or invalid JSON - that's fine
  }

  const result = await verifyJourneyAccess(
    slug,
    "id, is_published, curator_id, treats_per_week"
  );
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    treats_per_week?: number | null;
  };

  const supabase = await createClient();
  const weekStart = getWeekStart();
  const nextReset = getNextResetTime();

  // Check if treats are unlocked (at least one card revealed)
  const { count: totalCardReveals } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id);

  if ((totalCardReveals ?? 0) === 0) {
    return NextResponse.json(
      {
        error: "Reveal your first experience to unlock treats",
        code: "treats_locked",
      },
      { status: 400 }
    );
  }

  // Default to journey-level quota
  let effectivePerWeek = journey.treats_per_week ?? 1;

  // If destinationId provided, check for destination-specific quota override
  if (destinationId) {
    const { data: destination } = await supabase
      .from("destinations")
      .select("id, treats_per_week")
      .eq("id", destinationId)
      .eq("journey_id", journey.id)
      .single();

    if (destination) {
      // Cast to include quota fields
      const dest = destination as typeof destination & { treats_per_week?: number | null };
      effectivePerWeek = dest.treats_per_week ?? journey.treats_per_week ?? 1;
    }
  }

  // Count treat reveals this week for the destination context
  let treatsThisWeek = 0;
  if (destinationId) {
    // Count destination-specific treat reveals by joining treat_reveals -> treats
    const { data: treatRevealsData } = await supabase
      .from("treat_reveals")
      .select("id, treats!inner(destination_id)")
      .eq("journey_id", journey.id)
      .eq("treats.destination_id", destinationId)
      .gte("revealed_at", weekStart.toISOString());
    treatsThisWeek = treatRevealsData?.length ?? 0;
  } else {
    // Journey-wide count
    const { count } = await supabase
      .from("treat_reveals")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journey.id)
      .gte("revealed_at", weekStart.toISOString());
    treatsThisWeek = count ?? 0;
  }

  const remaining = Math.max(0, effectivePerWeek - treatsThisWeek);

  if (remaining === 0) {
    return NextResponse.json(
      {
        error: "Weekly treat quota reached",
        code: "quota_exceeded",
        nextResetTime: nextReset.toISOString(),
      },
      { status: 400 }
    );
  }

  // Get available treats - include both destination-specific and global (journey-wide) treats
  let query = supabase
    .from("treats")
    .select("*")
    .eq("journey_id", journey.id)
    .eq("is_revealed", false);

  // Include treats for this destination OR global treats (destination_id is null)
  if (destinationId) {
    query = query.or(`destination_id.eq.${destinationId},destination_id.is.null`);
  }

  const { data: availableTreats } = await query;

  console.log(`[REVEAL/TREAT] Available treats for raffle: ${availableTreats?.length || 0}`);
  availableTreats?.forEach((t, i) => {
    console.log(`[REVEAL/TREAT]   ${i}: "${t.name}"`);
  });

  if (!availableTreats || availableTreats.length === 0) {
    return NextResponse.json(
      { error: "No treats available to reveal", code: "no_treats" },
      { status: 400 }
    );
  }

  // Random selection
  const randomIndex = Math.floor(Math.random() * availableTreats.length);
  const selectedTreat = availableTreats[randomIndex];

  // Mark as revealed
  const { error: updateError } = await supabase
    .from("treats")
    .update({ is_revealed: true, revealed_at: new Date().toISOString() })
    .eq("id", selectedTreat.id);

  if (updateError) {
    console.error("[REVEAL/TREAT] Failed to update treat:", updateError);
    return NextResponse.json(
      { error: "Failed to reveal treat", code: "update_failed" },
      { status: 500 }
    );
  }

  // Create treat reveal record
  const { error: revealError } = await supabase.from("treat_reveals").insert({
    journey_id: journey.id,
    treat_id: selectedTreat.id,
    revealed_at: new Date().toISOString(),
  });

  if (revealError) {
    console.error("[REVEAL/TREAT] Failed to create treat_reveal record:", revealError);
    // Don't fail - treat is already revealed
  }

  // Return the revealed treat
  return NextResponse.json({
    type: "treat",
    treat: {
      id: selectedTreat.id,
      name: selectedTreat.name,
      description: selectedTreat.description,
      estimated_cost: selectedTreat.estimated_cost,
      destination_id: selectedTreat.destination_id,
    },
    quota: {
      remaining: remaining - 1,
      perWeek: effectivePerWeek,
      nextResetTime: nextReset.toISOString(),
    },
  });
}
