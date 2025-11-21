/**
 * Timestamp and nonce validation for payment verification.
 *
 * Provides functions to validate request timestamps and prevent replay attacks
 * using nonces. Implements the security specifications from the x402 protocol.
 */

import { NonceStore, InMemoryNonceStore } from "./NonceStore.js";
import { TIMESTAMP_WINDOW_MS } from "@metar/shared-config";

// Default store for backward compatibility
const defaultNonceStore = new InMemoryNonceStore();

/**
 * Validates that a timestamp is within acceptable bounds.
 *
 * Timestamps must be:
 * - In the past (or within 1 minute clock skew tolerance)
 * - Not older than maxAge (default 5 minutes)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param maxAge - Maximum age in milliseconds (default: TIMESTAMP_WINDOW_MS)
 * @returns true if timestamp is valid, false otherwise
 */
export function validateTimestamp(timestamp: number, maxAge: number = TIMESTAMP_WINDOW_MS): boolean {
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
 *
 * @param nonce - The nonce string (UUID v7 or random 32-byte hex)
 * @param agentKeyId - The agent key identifier
 * @param store - Optional NonceStore instance (defaults to in-memory store)
 * @returns true if nonce is valid (not previously used), false otherwise
 */
export async function checkNonce(
  nonce: string,
  agentKeyId: string,
  store: NonceStore = defaultNonceStore
): Promise<boolean> {
  // Warn if using in-memory store in production
  if (
    process.env.NODE_ENV === "production" &&
    store instanceof InMemoryNonceStore
  ) {
    console.warn(
      "SECURITY WARNING: Using InMemoryNonceStore in production. " +
      "Nonces will be lost on restart, allowing replay attacks. " +
      "Use FileNonceStore or a persistent database instead."
    );
  }
  return store.checkAndConsume(nonce, agentKeyId);
}
