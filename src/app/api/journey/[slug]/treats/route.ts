import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";
import { getTreatQuotaInfo } from "@/lib/api/treat-quota";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await verifyJourneyAccess(slug, "id, treats_per_week");
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    treats_per_week?: number | null;
  };

  const supabase = await createClient();

  // Fetch all treats for journey ordered by order_index
  const { data: treats, error: treatsError } = await supabase
    .from("treats")
    .select("*")
    .eq("journey_id", journey.id)
    .order("order_index");

  if (treatsError) {
    return NextResponse.json(
      { error: "Failed to fetch treats", details: treatsError.message },
      { status: 500 }
    );
  }

  // Calculate quota state using getTreatQuotaInfo
  const quotaInfo = await getTreatQuotaInfo(supabase, journey.id);

  return NextResponse.json({
    treats: treats || [],
    quotaInfo,
  });
}
