import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createJourneyAuthToken, createCuratorToken } from "@/lib/auth/journey-token";

// Cookie name for journey PIN auth
export const getJourneyAuthCookieName = (slug: string) => `journey-auth-${slug}`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { pin, curatorPreview } = await request.json();

  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // Get journey with ID for token creation (use service client to bypass RLS)
  const { data: journey, error } = await serviceClient
    .from("journeys")
    .select("id, access_code, is_published, curator_id")
    .eq("unique_slug", slug)
    .single();

  if (error || !journey) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // Check if user is the curator (admin preview mode)
  if (curatorPreview) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && journey.curator_id === user.id) {
      // Curator can preview without PIN - set signed curator token
      const token = createCuratorToken(journey.id);
      const response = NextResponse.json({ success: true, curatorAccess: true });
      response.cookies.set(getJourneyAuthCookieName(slug), token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      return response;
    }
  }

  // Regular PIN verification
  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
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
    const token = createJourneyAuthToken(journey.id, null);
    const response = NextResponse.json({ success: true });
    response.cookies.set(getJourneyAuthCookieName(slug), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return response;
  }

  // Verify PIN
  if (journey.access_code !== pin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  // Set signed auth token on successful PIN verification
  // Token is bound to journey ID + PIN hash, so changing PIN invalidates it
  const token = createJourneyAuthToken(journey.id, journey.access_code);
  const response = NextResponse.json({ success: true });
  response.cookies.set(getJourneyAuthCookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return response;
}
