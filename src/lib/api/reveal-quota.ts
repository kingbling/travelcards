import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export interface CardQuotaState {
  isRevealed: boolean;
  canReveal: boolean;
}

export type RevealDenialReason =
  | "already_revealed"
  | "quota_exceeded"
  | "not_found";

export interface RevealValidation {
  allowed: boolean;
  reason?: RevealDenialReason;
}

// ============================================================================
// Core Quota Logic
// ============================================================================

/**
 * Check if revealing a card is allowed.
 *
 * Simple quota enforcement: checks if card exists, not already revealed,
 * and weekly quota not exceeded.
 *
 * @param supabase - Supabase client
 * @param journeyId - Journey UUID
 * @param cardId - Card UUID to reveal
 * @param quotaLimit - Maximum reveals per week
 * @returns Validation result with reason if denied
 */
export async function canRevealCard(
  supabase: SupabaseClient,
  journeyId: string,
  cardId: string,
  quotaLimit: number
): Promise<RevealValidation> {
  // 1. Check if card exists and is not revealed
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, is_revealed")
    .eq("id", cardId)
    .eq("status", "approved")
    .single();

  if (cardError || !card) {
    return {
      allowed: false,
      reason: "not_found",
    };
  }

  if (card.is_revealed) {
    return {
      allowed: false,
      reason: "already_revealed",
    };
  }

  // 2. Check weekly quota (simple rolling 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journeyId)
    .gte("revealed_at", weekAgo.toISOString());

  const revealsThisWeek = count || 0;
  const hasQuota = revealsThisWeek < quotaLimit;

  if (!hasQuota) {
    return {
      allowed: false,
      reason: "quota_exceeded",
    };
  }

  // All checks passed
  return {
    allowed: true,
  };
}

/**
 * Get quota state for multiple cards.
 *
 * Cards are revealable if:
 * 1. Not already revealed
 * 2. reveal_date has passed (or is null)
 * 3. Weekly quota has not been exceeded
 *
 * @param supabase - Supabase client
 * @param journeyId - Journey UUID
 * @param cards - Array of cards with revealed status and reveal dates
 * @returns Map of card ID to quota state
 */
export async function getCardsQuotaState(
  supabase: SupabaseClient,
  journeyId: string,
  cards: Array<{
    id: string;
    is_revealed: boolean;
    reveal_date: string | null;
  }>
): Promise<Map<string, CardQuotaState>> {
  // Get weekly quota
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journeyId)
    .gte("revealed_at", weekAgo.toISOString());

  const revealsThisWeek = count || 0;

  const { data: journey } = await supabase
    .from("journeys")
    .select("reveals_per_week")
    .eq("id", journeyId)
    .single();

  const hasQuota = revealsThisWeek < (journey?.reveals_per_week || 2);

  // Get today's date as string for comparison (avoid timezone issues)
  const today = new Date().toISOString().split('T')[0];

  // Mark cards as revealable if reveal_date passed AND quota available
  const stateMap = new Map<string, CardQuotaState>();
  for (const card of cards) {
    if (card.is_revealed) {
      stateMap.set(card.id, {
        isRevealed: true,
        canReveal: false,
      });
      continue;
    }

    // Check if reveal_date has passed (or is null for curator preview)
    // Compare dates as strings to avoid timezone issues
    const revealDatePassed = !card.reveal_date || card.reveal_date <= today;

    stateMap.set(card.id, {
      isRevealed: false,
      canReveal: revealDatePassed && hasQuota,
    });
  }

  return stateMap;
}
