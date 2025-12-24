import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id: destinationId } = await params;

  const result = await verifyJourneyAccess(slug, "id, name, is_published, curator_id");
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    name: string;
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

  // Get ONLY revealed cards for this destination
  const { data: revealedCards } = await supabase
    .from("cards")
    .select(`
      id,
      name,
      description,
      category,
      rarity,
      picture_url,
      estimated_cost,
      duration_hours,
      experience_date,
      revealed_at
    `)
    .eq("destination_id", destinationId)
    .eq("status", "approved")
    .eq("is_revealed", true)
    .order("revealed_at", { ascending: false });

  // Get ONLY revealed treats for this destination (or journey-wide)
  const { data: revealedTreats } = await supabase
    .from("treats")
    .select(`
      id,
      name,
      description,
      estimated_cost,
      revealed_at
    `)
    .eq("journey_id", journey.id)
    .eq("is_revealed", true)
    .or(`destination_id.eq.${destinationId},destination_id.is.null`)
    .order("revealed_at", { ascending: false });

  // Count total approved cards (for progress display)
  const { count: totalCards } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("destination_id", destinationId)
    .eq("status", "approved");

  // Count total treats for destination
  const { count: totalTreats } = await supabase
    .from("treats")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id)
    .or(`destination_id.eq.${destinationId},destination_id.is.null`);

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

  return NextResponse.json({
    ...destination,
    journey_name: journey.name,
    revealedCards: revealedCards || [],
    revealedTreats: revealedTreats || [],
    progress: {
      cards: {
        revealed: revealedCards?.length || 0,
        total: totalCards || 0,
      },
      treats: {
        revealed: revealedTreats?.length || 0,
        total: totalTreats || 0,
      },
    },
    nextDestination: nextDestination
      ? {
          id: nextDestination.id,
          name: nextDestination.name,
          country: nextDestination.country,
          start_date: nextDestination.start_date,
          end_date: nextDestination.end_date,
        }
      : null,
  });
}
