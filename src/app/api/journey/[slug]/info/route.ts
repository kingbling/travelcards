import { NextResponse } from "next/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await verifyJourneyAccess(slug, "id, name, recipient_name, is_published, curator_id");

  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  return NextResponse.json({
    name: result.journey.name,
    recipient_name: result.journey.recipient_name,
  });
}
