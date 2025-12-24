import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";
import { getTreatsQuotaState } from "@/lib/api/treat-quota";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id: destinationId } = await params;

  const result = await verifyJourneyAccess(slug, "id, treats_per_week");
  if (!isJourneyAuthSuccess(result)) return result.response;

  const journey = result.journey;
  const supabase = await createClient();

  // Verify destination belongs to this journey
  const { data: destination } = await supabase
    .from("destinations")
    .select("id, journey_id")
    .eq("id", destinationId)
    .eq("journey_id", journey.id)
    .single();

  if (!destination) {
    return NextResponse.json(
      { error: "Destination not found" },
      { status: 404 }
    );
  }

  // Fetch treats for this destination (location-specific + all-destinations)
  const { data: treats } = await supabase
    .from("treats")
    .select("*")
    .eq("journey_id", journey.id)
    .or(`destination_id.eq.${destinationId},destination_id.is.null`)
    .order("order_index");

  // Get quota state for all treats
  const quotaMap = await getTreatsQuotaState(
    supabase,
    journey.id,
    treats || []
  );

  // Attach quota state to each treat
  const treatsWithQuota = (treats || []).map((treat) => ({
    ...treat,
    quota: quotaMap.get(treat.id) || { isRevealed: false, canReveal: false },
  }));

  return NextResponse.json({
    treats: treatsWithQuota,
  });
}
