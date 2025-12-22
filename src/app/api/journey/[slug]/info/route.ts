import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // First try to get journey without published filter
  const { data: journey, error } = await supabase
    .from("journeys")
    .select("name, recipient_name, is_published, curator_id")
    .eq("unique_slug", slug)
    .single();

  if (error || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // If published, return info
  if (journey.is_published) {
    return NextResponse.json({
      name: journey.name,
      recipient_name: journey.recipient_name,
    });
  }

  // If not published, check if user is curator
  const { data: { user } } = await supabase.auth.getUser();
  if (user && journey.curator_id === user.id) {
    return NextResponse.json({
      name: journey.name,
      recipient_name: journey.recipient_name,
    });
  }

  // Not published and not curator
  return NextResponse.json({ error: "Journey not found" }, { status: 404 });
}
