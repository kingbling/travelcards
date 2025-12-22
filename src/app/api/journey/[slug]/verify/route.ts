import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { pin } = await request.json();

  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: journey, error } = await supabase
    .from("journeys")
    .select("access_code")
    .eq("unique_slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // If no access code is set, any PIN is valid (or no PIN required)
  if (!journey.access_code) {
    return NextResponse.json({ success: true });
  }

  // Verify PIN
  if (journey.access_code !== pin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
