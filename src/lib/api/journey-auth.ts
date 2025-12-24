import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyJourneyAuthToken, verifyCuratorToken } from "@/lib/auth/journey-token";

// Cookie name for journey PIN auth (must match verify route)
const getJourneyAuthCookieName = (slug: string) => `journey-auth-${slug}`;

interface JourneyAuthResult {
  success: true;
  journey: {
    id: string;
    name: string;
    is_published: boolean | null;
    curator_id: string | null;
    access_code?: string | null;
    [key: string]: unknown;
  };
}

interface JourneyAuthError {
  success: false;
  response: NextResponse;
}

/**
 * Verify journey access - handles published, curator preview, and PIN-authenticated modes.
 * Use this in API routes to reduce duplication.
 *
 * Access is granted if ANY of these are true:
 * 1. Journey is published
 * 2. Current user is the curator
 * 3. User has a valid signed PIN auth token for this journey
 *
 * @param slug - The journey slug
 * @param selectFields - Additional fields to select from journeys table
 * @returns Journey data if authorized, or error response
 */
export async function verifyJourneyAccess(
  slug: string,
  selectFields: string = "id, name, is_published, curator_id"
): Promise<JourneyAuthResult | JourneyAuthError> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const cookieStore = await cookies();

  // Always fetch access_code for token verification (use service client to bypass RLS)
  const fieldsWithAccessCode = selectFields.includes("access_code")
    ? selectFields
    : `${selectFields}, access_code`;

  const { data, error } = await serviceClient
    .from("journeys")
    .select(fieldsWithAccessCode)
    .eq("unique_slug", slug)
    .single();

  // Differentiate between database errors and not found
  if (error) {
    console.error("[JOURNEY-AUTH] Database error fetching journey:", {
      slug,
      error: error.message,
      code: error.code,
    });

    // PGRST116 is "no rows returned" - treat as 404
    if (error.code === "PGRST116") {
      return {
        success: false,
        response: NextResponse.json({ error: "Journey not found" }, { status: 404 }),
      };
    }

    // Other database errors are 500
    return {
      success: false,
      response: NextResponse.json(
        { error: "Failed to fetch journey", details: error.message },
        { status: 500 }
      ),
    };
  }

  if (!data) {
    console.warn("[JOURNEY-AUTH] Journey not found:", slug);
    return {
      success: false,
      response: NextResponse.json({ error: "Journey not found" }, { status: 404 }),
    };
  }

  // Type assertion since we know the structure
  const journey = data as unknown as JourneyAuthResult["journey"];

  // 1. If published, anyone can access
  if (journey.is_published) {
    return { success: true, journey };
  }

  // 2. Check for signed auth token cookie
  const authCookie = cookieStore.get(getJourneyAuthCookieName(slug));
  if (authCookie?.value) {
    const token = authCookie.value;

    // Check if it's a curator token
    if (token.startsWith("curator:")) {
      if (verifyCuratorToken(token, journey.id)) {
        return { success: true, journey };
      }
    } else {
      // Regular PIN auth token - verify against current PIN
      if (verifyJourneyAuthToken(token, journey.id, journey.access_code || null)) {
        return { success: true, journey };
      }
    }
    // Token is invalid or expired - continue to check other auth methods
  }

  // 3. If not published and no valid token, check if curator
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("[JOURNEY-AUTH] Auth check failed:", authError.message);
    return {
      success: false,
      response: NextResponse.json({ error: "Journey not found" }, { status: 404 }),
    };
  }

  if (user && journey.curator_id === user.id) {
    return { success: true, journey };
  }

  console.warn("[JOURNEY-AUTH] Unauthorized access attempt:", {
    slug,
    userId: user?.id,
    curatorId: journey.curator_id,
    hasToken: !!authCookie?.value,
  });
  return {
    success: false,
    response: NextResponse.json({ error: "Journey not found" }, { status: 404 }),
  };
}

/**
 * Type guard to check if result is successful
 */
export function isJourneyAuthSuccess(
  result: JourneyAuthResult | JourneyAuthError
): result is JourneyAuthResult {
  return result.success === true;
}
