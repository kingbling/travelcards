import { createHmac } from "crypto";

// Secret for signing journey auth tokens
// Falls back to Supabase service key hash if not set (not ideal but works)
const getSecret = () => {
  const secret = process.env.JOURNEY_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("JOURNEY_AUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY required");
  }
  return secret;
};

/**
 * Create a signed token for journey PIN authentication.
 * Token format: {journeyId}:{pinHash}:{timestamp}:{signature}
 *
 * The signature binds the token to:
 * - The specific journey ID
 * - A hash of the PIN (so changing PIN invalidates old tokens)
 * - A timestamp (for optional expiry checks)
 */
export function createJourneyAuthToken(journeyId: string, pin: string | null): string {
  const timestamp = Date.now();
  // Hash the PIN (or use "none" if no PIN required)
  const pinHash = pin
    ? createHmac("sha256", getSecret()).update(pin).digest("hex").slice(0, 16)
    : "none";

  const payload = `${journeyId}:${pinHash}:${timestamp}`;
  const signature = createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  return `${payload}:${signature}`;
}

/**
 * Verify a journey auth token.
 * Returns the journey ID if valid, null if invalid.
 */
export function verifyJourneyAuthToken(
  token: string,
  expectedJourneyId: string,
  currentPin: string | null
): boolean {
  try {
    const parts = token.split(":");
    if (parts.length !== 4) return false;

    const [journeyId, pinHash, timestampStr, signature] = parts;

    // Check journey ID matches
    if (journeyId !== expectedJourneyId) return false;

    // Verify PIN hash matches current PIN
    const expectedPinHash = currentPin
      ? createHmac("sha256", getSecret()).update(currentPin).digest("hex").slice(0, 16)
      : "none";
    if (pinHash !== expectedPinHash) return false;

    // Verify signature
    const payload = `${journeyId}:${pinHash}:${timestampStr}`;
    const expectedSignature = createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex")
      .slice(0, 32);

    if (signature !== expectedSignature) return false;

    // Optional: Check token age (reject if older than 30 days)
    const timestamp = parseInt(timestampStr, 10);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (Date.now() - timestamp > maxAge) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Create a curator token (doesn't require PIN verification).
 */
export function createCuratorToken(journeyId: string): string {
  const timestamp = Date.now();
  const payload = `curator:${journeyId}:${timestamp}`;
  const signature = createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  return `${payload}:${signature}`;
}

/**
 * Verify a curator token.
 */
export function verifyCuratorToken(token: string, expectedJourneyId: string): boolean {
  try {
    const parts = token.split(":");
    if (parts.length !== 4) return false;

    const [prefix, journeyId, timestampStr, signature] = parts;

    if (prefix !== "curator") return false;
    if (journeyId !== expectedJourneyId) return false;

    // Verify signature
    const payload = `curator:${journeyId}:${timestampStr}`;
    const expectedSignature = createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex")
      .slice(0, 32);

    if (signature !== expectedSignature) return false;

    // Check token age
    const timestamp = parseInt(timestampStr, 10);
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAge) return false;

    return true;
  } catch {
    return false;
  }
}
