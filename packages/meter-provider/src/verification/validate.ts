/**
 * Timestamp and nonce validation for payment verification.
 * 
 * Provides functions to validate request timestamps and prevent replay attacks
 * using nonces. Implements the security specifications from the x402 protocol.
 */

const nonceStore = new Map<string, { timestamp: number; consumed: boolean }>();

/**
 * Validates that a timestamp is within acceptable bounds.
 * 
 * Timestamps must be:
 * - In the past (or within 1 minute clock skew tolerance)
 * - Not older than maxAge (default 5 minutes)
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @param maxAge - Maximum age in milliseconds (default: 300000 = 5 minutes)
 * @returns true if timestamp is valid, false otherwise
 */
export function validateTimestamp(timestamp: number, maxAge: number = 300000): boolean {
  const now = Date.now();
  const age = now - timestamp;

  // Timestamp must be in the past and not too old (5 minutes default)
  // Allow ±1 minute clock skew
  return age >= -60000 && age <= maxAge;
}

/**
 * Checks if a nonce has been used before and marks it as consumed.
 * 
 * Nonces must be unique per agent key. Once consumed, they cannot be reused.
 * Old nonces (older than 1 hour) are automatically cleaned up.
 * 
 * @param nonce - The nonce string (UUID v7 or random 32-byte hex)
 * @param agentKeyId - The agent key identifier
 * @returns true if nonce is valid (not previously used), false otherwise
 */
export async function checkNonce(
  nonce: string,
  agentKeyId: string
): Promise<boolean> {
  const key = `${agentKeyId}:${nonce}`;

  // Check if nonce was already used
  const existing = nonceStore.get(key);
  if (existing && existing.consumed) {
    return false;
  }

  // Mark as consumed
  nonceStore.set(key, {
    timestamp: Date.now(),
    consumed: true,
  });

  // Cleanup old nonces (older than 1 hour)
  cleanupNonces();

  return true;
}

/**
 * Cleans up nonces older than 1 hour from the store.
 * 
 * This function is called automatically after each nonce check to prevent
 * memory leaks. Nonces older than 1 hour are removed from the store.
 */
function cleanupNonces() {
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, value] of nonceStore.entries()) {
    if (value.timestamp < oneHourAgo) {
      nonceStore.delete(key);
    }
  }
}

