import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: journey, error } = await supabase
    .from("journeys")
    .select("name, recipient_name")
    .eq("unique_slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  return NextResponse.json(journey);
}
