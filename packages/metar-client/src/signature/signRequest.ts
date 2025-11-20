import nacl from "tweetnacl";

/**
 * Signs a signature base string using ed25519 private key.
 *
 * This implements the Visa Trusted Agent Protocol (TAP) signature generation
 * using HTTP Signature format (RFC 9421). The signature is computed over the
 * base string and returned as a base64-encoded string.
 *
 * @param privateKey - Ed25519 private key (32 bytes)
 * @param baseString - The signature base string to sign
 * @returns Base64-encoded signature (64 bytes for ed25519)
 *
 * @example
 * ```typescript
 * import { signRequest } from "@metar/metar-client";
 * import { constructSignatureBaseString } from "@metar/metar-client";
 *
 * const baseString = constructSignatureBaseString(
 *   "POST",
 *   "/api/summarize",
 *   "Mon, 01 Jan 2024 12:00:00 GMT",
 *   "nonce-123",
 *   "tx-signature"
 * );
 *
 * const signature = signRequest(privateKey, baseString);
 * // Returns: "dGVzdA==" (base64-encoded signature)
 * ```
 */
export function signRequest(privateKey: Uint8Array, baseString: string): string {
  const message = new TextEncoder().encode(baseString);
  const signature = nacl.sign.detached(message, privateKey);
  return Buffer.from(signature).toString("base64");
}
