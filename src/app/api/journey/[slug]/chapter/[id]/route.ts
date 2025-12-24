import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id: chapterId } = await params;

  const result = await verifyJourneyAccess(slug);
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const supabase = await createClient();

  // Get chapter with destination info
  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select(`
      id,
      name,
      description,
      unlock_date,
      reveal_cooldown_hours,
      card_count,
      order_index,
      destination_id,
      destinations (
        id,
        name,
        country,
        theme_colors,
        journey_id
      )
    `)
    .eq("id", chapterId)
    .single();

  if (chapterError || !chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // Verify chapter belongs to the journey
  const destination = Array.isArray(chapter.destinations)
    ? chapter.destinations[0]
    : chapter.destinations;
  if (!destination || destination.journey_id !== result.journey.id) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // Get approved cards for this chapter
  const { data: cards } = await supabase
    .from("cards")
    .select("*")
    .eq("chapter_id", chapterId)
    .eq("status", "approved")
    .order("order_index", { ascending: true });

  return NextResponse.json({
    ...chapter,
    destination,
    cards: cards || [],
  });
}
