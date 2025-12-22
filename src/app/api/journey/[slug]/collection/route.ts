import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get journey with destinations
  const { data: journey, error: journeyError } = await supabase
    .from("journeys")
    .select(`
      id,
      name,
      destinations (
        id,
        name,
        theme_colors
      )
    `)
    .eq("unique_slug", slug)
    .eq("is_published", true)
    .single();

  if (journeyError || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // Get all destination IDs
  const destinationIds = (journey.destinations || []).map((d) => d.id);

  // Get total approved cards count
  const { count: totalCards } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .in("destination_id", destinationIds)
    .eq("status", "approved");

  // Get revealed cards
  const { data: revealedCards } = await supabase
    .from("cards")
    .select("*")
    .in("destination_id", destinationIds)
    .eq("status", "approved")
    .eq("is_revealed", true)
    .order("revealed_at", { ascending: false });

  return NextResponse.json({
    journey_name: journey.name,
    total_cards: totalCards || 0,
    revealed_cards: revealedCards || [],
    destinations: journey.destinations || [],
  });
}
