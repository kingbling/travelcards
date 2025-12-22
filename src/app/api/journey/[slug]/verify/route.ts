import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { pin, curatorPreview } = await request.json();

  const supabase = await createClient();

  // Check if user is the curator (admin preview mode)
  if (curatorPreview) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: journey } = await supabase
        .from("journeys")
        .select("curator_id")
        .eq("unique_slug", slug)
        .single();

      if (journey && journey.curator_id === user.id) {
        // Curator can preview without PIN
        return NextResponse.json({ success: true, curatorAccess: true });
      }
    }
  }

  // Regular PIN verification
  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  // For public access, journey must be published
  const { data: journey, error } = await supabase
    .from("journeys")
    .select("access_code, is_published, curator_id")
    .eq("unique_slug", slug)
    .single();

  if (error || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // Check if user is curator - can access unpublished
  const { data: { user } } = await supabase.auth.getUser();
  const isCurator = user && journey.curator_id === user.id;

  // If not published and not curator, deny access
  if (!journey.is_published && !isCurator) {
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
