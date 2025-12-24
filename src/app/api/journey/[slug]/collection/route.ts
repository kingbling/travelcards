import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get journey with destinations (without is_published filter for curator preview)
  const { data: journey, error: journeyError } = await supabase
    .from("journeys")
    .select(`
      id,
      name,
      is_published,
      curator_id,
      destinations (
        id,
        name,
        theme_colors
      )
    `)
    .eq("unique_slug", slug)
    .single();

  if (journeyError || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // If not published, check if user is curator (preview mode)
  if (!journey.is_published) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || journey.curator_id !== user.id) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }
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
