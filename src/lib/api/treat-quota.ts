import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export interface TreatQuotaState {
  isRevealed: boolean;
  canReveal: boolean;
}

export type TreatRevealDenialReason =
  | "already_revealed"
  | "quota_exceeded"
  | "not_found"
  | "no_cards_revealed"; // NEW: First treat requires at least 1 card revealed

export interface TreatRevealValidation {
  allowed: boolean;
  reason?: TreatRevealDenialReason;
}

export interface TreatQuotaInfo {
  treatsRevealed: number;
  treatsPerWeek: number;
  remainingTreats: number;
  hasQuota: boolean;
  anyCardRevealed: boolean; // NEW: Track if unlock condition is met
}

// ============================================================================
// Core Quota Logic
// ============================================================================

/**
 * Check if revealing a treat is allowed.
 *
 * Treat unlock conditions:
 * 1. At least one card has been revealed (unlock condition)
 * 2. Treat not already revealed
 * 3. Weekly quota not exceeded
 *
 * @param supabase - Supabase client
 * @param journeyId - Journey UUID
 * @param treatId - Treat UUID to reveal
 * @param quotaLimit - Maximum treats per week
 * @returns Validation result with reason if denied
 */
export async function canRevealTreat(
  supabase: SupabaseClient,
  journeyId: string,
  treatId: string,
  quotaLimit: number
): Promise<TreatRevealValidation> {
  // 1. Check if ANY card has been revealed (unlock condition)
  const { count: cardRevealCount } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journeyId);

  if (!cardRevealCount || cardRevealCount === 0) {
    return {
      allowed: false,
      reason: "no_cards_revealed",
    };
  }

  // 2. Check if treat exists and is not already revealed
  const { data: treat, error: treatError } = await supabase
    .from("treats")
    .select("id, is_revealed")
    .eq("id", treatId)
    .eq("journey_id", journeyId)
    .single();

  if (treatError || !treat) {
    return {
      allowed: false,
      reason: "not_found",
    };
  }

  if (treat.is_revealed) {
    return {
      allowed: false,
      reason: "already_revealed",
    };
  }

  // 3. Check weekly quota (rolling 7-day window)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabase
    .from("treat_reveals")
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
 * Get quota state for multiple treats.
 *
 * Treats are revealable if:
 * 1. At least one card has been revealed (unlock condition)
 * 2. Not already revealed
 * 3. Weekly quota has not been exceeded
 *
 * @param supabase - Supabase client
 * @param journeyId - Journey UUID
 * @param treats - Array of treats with revealed status
 * @returns Map of treat ID to quota state
 */
export async function getTreatsQuotaState(
  supabase: SupabaseClient,
  journeyId: string,
  treats: Array<{
    id: string;
    is_revealed: boolean | null;
  }>
): Promise<Map<string, TreatQuotaState>> {
  // Check if any card revealed (unlock condition)
  const { count: cardRevealCount } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journeyId);

  const anyCardRevealed = (cardRevealCount || 0) > 0;

  // Get weekly quota
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabase
    .from("treat_reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journeyId)
    .gte("revealed_at", weekAgo.toISOString());

  const revealsThisWeek = count || 0;

  const { data: journey } = await supabase
    .from("journeys")
    .select("treats_per_week")
    .eq("id", journeyId)
    .single();

  const hasQuota = revealsThisWeek < (journey?.treats_per_week || 1);

  // Build state map
  const stateMap = new Map<string, TreatQuotaState>();
  for (const treat of treats) {
    if (treat.is_revealed) {
      stateMap.set(treat.id, {
        isRevealed: true,
        canReveal: false,
      });
      continue;
    }

    // Can reveal if unlocked AND has quota
    stateMap.set(treat.id, {
      isRevealed: false,
      canReveal: anyCardRevealed && hasQuota,
    });
  }

  return stateMap;
}

/**
 * Get detailed quota information for UI display.
 *
 * @param supabase - Supabase client
 * @param journeyId - Journey UUID
 * @returns Quota information
 */
export async function getTreatQuotaInfo(
  supabase: SupabaseClient,
  journeyId: string
): Promise<TreatQuotaInfo> {
  // Get journey settings
  const { data: journey } = await supabase
    .from("journeys")
    .select("treats_per_week")
    .eq("id", journeyId)
    .single();

  const treatsPerWeek = journey?.treats_per_week || 1;

  // Check unlock condition
  const { count: cardRevealCount } = await supabase
    .from("reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journeyId);

  const anyCardRevealed = (cardRevealCount || 0) > 0;

  // Count treats revealed in last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabase
    .from("treat_reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journeyId)
    .gte("revealed_at", weekAgo.toISOString());

  const treatsRevealed = count || 0;
  const remainingTreats = Math.max(0, treatsPerWeek - treatsRevealed);
  const hasQuota = treatsRevealed < treatsPerWeek;

  return {
    treatsRevealed,
    treatsPerWeek,
    remainingTreats,
    hasQuota,
    anyCardRevealed,
  };
}
