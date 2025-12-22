import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get journey ID first
  const { data: journey, error: journeyError } = await supabase
    .from("journeys")
    .select("id")
    .eq("unique_slug", slug)
    .eq("is_published", true)
    .single();

  if (journeyError || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // Get intro love letter
  const { data: letter, error } = await supabase
    .from("love_letters")
    .select("title, content")
    .eq("journey_id", journey.id)
    .eq("display_on", "intro")
    .order("order_index", { ascending: true })
    .limit(1)
    .single();

  if (error || !letter) {
    // Return default content if no intro letter
    return NextResponse.json({
      title: "Your Adventure Awaits",
      content: "Each card you reveal is a carefully chosen experience, wrapped with love.\n\nReady to begin?",
    });
  }

  return NextResponse.json(letter);
}
