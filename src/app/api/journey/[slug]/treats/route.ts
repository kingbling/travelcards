import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

/**
 * Get the start of the current week (Monday at midnight UTC)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the next Monday at midnight UTC
 */
function getNextResetTime(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 1 ? 7 : ((8 - dayOfWeek) % 7) || 7;
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await verifyJourneyAccess(slug, "id, is_published, curator_id, treats_per_week");
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    treats_per_week?: number | null;
  };

  const supabase = await createClient();
  const weekStart = getWeekStart();
  const nextReset = getNextResetTime();

  // Fetch ONLY revealed treats for journey
  const { data: treats, error: treatsError } = await supabase
    .from("treats")
    .select("*")
    .eq("journey_id", journey.id)
    .eq("is_revealed", true)
    .order("revealed_at", { ascending: false });

  if (treatsError) {
    return NextResponse.json(
      { error: "Failed to fetch treats", details: treatsError.message },
      { status: 500 }
    );
  }

  // Count reveals this week (fixed weekly reset)
  const { count: treatsRevealedThisWeek } = await supabase
    .from("treat_reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id)
    .gte("revealed_at", weekStart.toISOString());

  // Check if any card revealed (unlocks treats)
  const { count: totalCardReveals } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id);

  // Count unrevealed treats available
  const { count: availableTreats } = await supabase
    .from("treats")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id)
    .eq("is_revealed", false);

  const treatsPerWeek = journey.treats_per_week ?? 1;
  const remaining = Math.max(0, treatsPerWeek - (treatsRevealedThisWeek ?? 0));
  const treatsUnlocked = (totalCardReveals ?? 0) > 0;

  // Calculate days until reset
  const now = new Date();
  const msUntilReset = nextReset.getTime() - now.getTime();
  const daysUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60 * 24));

  return NextResponse.json({
    treats: treats || [],
    quota: {
      canReveal: treatsUnlocked && remaining > 0 && (availableTreats ?? 0) > 0,
      remaining,
      perWeek: treatsPerWeek,
      available: availableTreats ?? 0,
      unlocked: treatsUnlocked,
      nextResetTime: nextReset.toISOString(),
      daysUntilReset,
    },
  });
}
