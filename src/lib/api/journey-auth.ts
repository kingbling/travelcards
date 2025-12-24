import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface JourneyAuthResult {
  success: true;
  journey: {
    id: string;
    name: string;
    is_published: boolean | null;
    curator_id: string | null;
    [key: string]: unknown;
  };
}

interface JourneyAuthError {
  success: false;
  response: NextResponse;
}

/**
 * Verify journey access - handles both published and curator preview modes.
 * Use this in API routes to reduce duplication.
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

  const { data, error } = await supabase
    .from("journeys")
    .select(selectFields)
    .eq("unique_slug", slug)
    .single();

  if (error || !data) {
    return {
      success: false,
      response: NextResponse.json({ error: "Journey not found" }, { status: 404 }),
    };
  }

  // Type assertion since we know the structure
  const journey = data as unknown as JourneyAuthResult["journey"];

  // If published, anyone can access
  if (journey.is_published) {
    return { success: true, journey };
  }

  // If not published, only curator can access (preview mode)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || journey.curator_id !== user.id) {
    return {
      success: false,
      response: NextResponse.json({ error: "Journey not found" }, { status: 404 }),
    };
  }

  return { success: true, journey };
}

/**
 * Type guard to check if result is successful
 */
export function isJourneyAuthSuccess(
  result: JourneyAuthResult | JourneyAuthError
): result is JourneyAuthResult {
  return result.success === true;
}
