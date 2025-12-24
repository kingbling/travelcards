import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await verifyJourneyAccess(slug, "id, name, recipient_name, is_published, curator_id, reveals_per_week");
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const supabase = await createClient();

  // Get destinations for this journey
  const { data: destinations } = await supabase
    .from("destinations")
    .select("id, name, country, start_date, end_date, theme_colors, order_index")
    .eq("journey_id", result.journey.id)
    .order("order_index", { ascending: true });

  // Sort destinations by order_index
  const sortedDestinations = (destinations || []).sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  // Get card counts for each destination (cards are linked via destination_id, not chapter_id)
  const destinationsWithCounts = await Promise.all(
    sortedDestinations.map(async (destination) => {
      // Get total approved cards for this destination
      const { count: totalCount } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("destination_id", destination.id)
        .eq("status", "approved");

      // Get revealed card count
      const { count: revealedCount } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("destination_id", destination.id)
        .eq("status", "approved")
        .eq("is_revealed", true);

      // Calculate max reveals based on destination duration
      let maxDestinationReveals = totalCount || 0;
      if (destination.start_date && destination.end_date) {
        const destStartDate = new Date(destination.start_date);
        const destEndDate = new Date(destination.end_date);
        const destDurationDays = Math.ceil(
          (destEndDate.getTime() - destStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const revealsPerWeek = (result.journey as { reveals_per_week?: number | null }).reveals_per_week ?? 2;
        const calculatedMax = Math.floor((destDurationDays / 7) * revealsPerWeek);
        // Use the minimum of calculated max and actual card count
        maxDestinationReveals = Math.min(calculatedMax, totalCount || 0);
      }

      return {
        ...destination,
        total_count: maxDestinationReveals,
        revealed_count: revealedCount || 0,
      };
    })
  );

  return NextResponse.json({
    id: result.journey.id,
    name: result.journey.name,
    recipient_name: (result.journey as { recipient_name?: string }).recipient_name,
    reveals_per_week: (result.journey as { reveals_per_week?: number | null }).reveals_per_week ?? 2,
    destinations: destinationsWithCounts,
  });
}
