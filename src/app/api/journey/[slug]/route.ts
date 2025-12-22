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
      recipient_name,
      destinations (
        id,
        name,
        country,
        start_date,
        end_date,
        theme_colors,
        order_index
      )
    `)
    .eq("unique_slug", slug)
    .eq("is_published", true)
    .single();

  if (journeyError || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // Sort destinations by order_index
  const sortedDestinations = (journey.destinations || []).sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  // Get chapters for each destination with card counts
  const destinationsWithChapters = await Promise.all(
    sortedDestinations.map(async (destination) => {
      const { data: chapters } = await supabase
        .from("chapters")
        .select(`
          id,
          name,
          description,
          unlock_date,
          card_count,
          order_index
        `)
        .eq("destination_id", destination.id)
        .order("order_index", { ascending: true });

      // Get revealed card counts for each chapter
      const chaptersWithCounts = await Promise.all(
        (chapters || []).map(async (chapter) => {
          const { count: totalCount } = await supabase
            .from("cards")
            .select("*", { count: "exact", head: true })
            .eq("chapter_id", chapter.id)
            .eq("status", "approved");

          const { count: revealedCount } = await supabase
            .from("cards")
            .select("*", { count: "exact", head: true })
            .eq("chapter_id", chapter.id)
            .eq("status", "approved")
            .eq("is_revealed", true);

          return {
            ...chapter,
            total_count: totalCount || 0,
            revealed_count: revealedCount || 0,
          };
        })
      );

      return {
        ...destination,
        chapters: chaptersWithCounts,
      };
    })
  );

  return NextResponse.json({
    ...journey,
    destinations: destinationsWithChapters,
  });
}
