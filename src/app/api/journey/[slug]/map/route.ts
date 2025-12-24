import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await verifyJourneyAccess(slug, "id");
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const supabase = await createClient();

  // Get all destination IDs for this journey
  const { data: destinations } = await supabase
    .from("destinations")
    .select("id")
    .eq("journey_id", result.journey.id);

  const destinationIds = (destinations || []).map((d) => d.id);

  if (destinationIds.length === 0) {
    return NextResponse.json({ cards: [] });
  }

  // Get revealed cards with location data
  const { data: cards } = await supabase
    .from("cards")
    .select(
      "id, name, description, category, rarity, estimated_cost, duration_hours, location_lat, location_lng, location_name, location_address, picture_url, destination_id"
    )
    .in("destination_id", destinationIds)
    .eq("status", "approved")
    .eq("is_revealed", true)
    .not("location_lat", "is", null)
    .not("location_lng", "is", null);

  return NextResponse.json({ cards: cards || [] });
}
