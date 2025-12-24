import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";

/**
 * Get the start of the current week (Monday at midnight UTC)
 */
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  // Convert Sunday=0 to Monday=0 system: (day + 6) % 7
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get the next Monday at midnight UTC (quota reset time)
 */
function getNextResetTime(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  // Days until next Monday: if today is Monday (1), it's 7 days; otherwise calculate
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

  // Parse optional destinationId from query
  const url = new URL(request.url);
  const destinationId = url.searchParams.get("destinationId");

  const result = await verifyJourneyAccess(
    slug,
    "id, is_published, curator_id, reveals_per_week, treats_per_week"
  );
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const journey = result.journey as {
    id: string;
    reveals_per_week?: number | null;
    treats_per_week?: number | null;
  };

  const supabase = await createClient();
  const weekStart = getWeekStart();
  const nextReset = getNextResetTime();

  // Default to journey-level quotas
  let effectiveCardsPerWeek = journey.reveals_per_week ?? 2;
  let effectiveTreatsPerWeek = journey.treats_per_week ?? 1;

  // If destinationId provided, check for destination-specific overrides
  if (destinationId) {
    const { data: destination } = await supabase
      .from("destinations")
      .select("id, reveals_per_week, treats_per_week")
      .eq("id", destinationId)
      .eq("journey_id", journey.id)
      .single();

    if (destination) {
      // Cast to include quota fields
      const dest = destination as typeof destination & { reveals_per_week?: number | null; treats_per_week?: number | null };
      // Use destination overrides if set, otherwise fall back to journey defaults
      effectiveCardsPerWeek = dest.reveals_per_week ?? journey.reveals_per_week ?? 2;
      effectiveTreatsPerWeek = dest.treats_per_week ?? journey.treats_per_week ?? 1;
    }
  }

  // Count card reveals this week for the specific destination (if provided)
  let cardRevealsThisWeek = 0;
  if (destinationId) {
    // Count reveals for this specific destination by joining reveals -> cards
    const { data: revealsData } = await supabase
      .from("reveals")
      .select("id, cards!inner(destination_id)")
      .eq("journey_id", journey.id)
      .eq("cards.destination_id", destinationId)
      .gte("revealed_at", weekStart.toISOString());
    cardRevealsThisWeek = revealsData?.length ?? 0;
  } else {
    // Journey-wide count
    const { count } = await supabase
      .from("reveals")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journey.id)
      .gte("revealed_at", weekStart.toISOString());
    cardRevealsThisWeek = count ?? 0;
  }

  // Count treat reveals this week for the destination context
  let treatRevealsThisWeek = 0;
  if (destinationId) {
    // Count destination-specific treat reveals by joining treat_reveals -> treats
    const { data: treatRevealsData } = await supabase
      .from("treat_reveals")
      .select("id, treats!inner(destination_id)")
      .eq("journey_id", journey.id)
      .eq("treats.destination_id", destinationId)
      .gte("revealed_at", weekStart.toISOString());
    treatRevealsThisWeek = treatRevealsData?.length ?? 0;
  } else {
    // Journey-wide count
    const { count } = await supabase
      .from("treat_reveals")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journey.id)
      .gte("revealed_at", weekStart.toISOString());
    treatRevealsThisWeek = count ?? 0;
  }

  // Check if any card has been revealed (unlocks treats)
  const { count: totalCardReveals } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id);

  // Check available cards for this destination (or all destinations)
  let availableCards = 0;
  let previewCard: { picture_url: string | null } | null = null;

  if (destinationId) {
    // Cards for specific destination
    const { data: availableCardsList } = await supabase
      .from("cards")
      .select("id, picture_url")
      .eq("destination_id", destinationId)
      .eq("status", "approved")
      .eq("is_revealed", false);

    availableCards = availableCardsList?.length ?? 0;

    if (availableCardsList && availableCardsList.length > 0) {
      const randomIdx = Math.floor(Math.random() * availableCardsList.length);
      previewCard = { picture_url: availableCardsList[randomIdx].picture_url };
    }
  } else {
    // All destinations in journey
    const { data: destinations } = await supabase
      .from("destinations")
      .select("id")
      .eq("journey_id", journey.id);

    const destinationIds = destinations?.map((d) => d.id) || [];

    if (destinationIds.length > 0) {
      const { data: availableCardsList } = await supabase
        .from("cards")
        .select("id, picture_url")
        .eq("status", "approved")
        .eq("is_revealed", false)
        .in("destination_id", destinationIds);

      availableCards = availableCardsList?.length ?? 0;

      if (availableCardsList && availableCardsList.length > 0) {
        const randomIdx = Math.floor(Math.random() * availableCardsList.length);
        previewCard = { picture_url: availableCardsList[randomIdx].picture_url };
      }
    }
  }

  // Check available treats for destination context (includes global treats)
  let availableTreatsQuery = supabase
    .from("treats")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id)
    .eq("is_revealed", false);

  if (destinationId) {
    // Include destination-specific AND global treats
    availableTreatsQuery = availableTreatsQuery.or(`destination_id.eq.${destinationId},destination_id.is.null`);
  }

  const { count: availableTreats } = await availableTreatsQuery;

  const cardsRemaining = Math.max(0, effectiveCardsPerWeek - cardRevealsThisWeek);
  const treatsRemaining = Math.max(0, effectiveTreatsPerWeek - treatRevealsThisWeek);
  const treatsUnlocked = (totalCardReveals ?? 0) > 0;

  // Calculate days until reset
  const now = new Date();
  const msUntilReset = nextReset.getTime() - now.getTime();
  const daysUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60 * 24));

  return NextResponse.json({
    cards: {
      canReveal: cardsRemaining > 0 && availableCards > 0,
      remaining: cardsRemaining,
      perWeek: effectiveCardsPerWeek,
      available: availableCards,
      nextResetTime: nextReset.toISOString(),
      daysUntilReset,
      preview: previewCard,
    },
    treats: {
      canReveal: treatsUnlocked && treatsRemaining > 0 && (availableTreats ?? 0) > 0,
      remaining: treatsRemaining,
      perWeek: effectiveTreatsPerWeek,
      available: availableTreats ?? 0,
      unlocked: treatsUnlocked,
      nextResetTime: nextReset.toISOString(),
      daysUntilReset,
    },
  });
}
