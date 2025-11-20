/**
 * Creates an HTTP Signature authorization header per Visa Trusted Agent Protocol (TAP).
 *
 * This implements the HTTP Signature format (RFC 9421) as specified by Visa TAP.
 * The header includes the keyId, algorithm, headers list, and signature.
 *
 * @param keyId - Agent key identifier
 * @param signature - Base64-encoded signature
 * @returns HTTP Signature authorization header string
 *
 * @example
 * ```typescript
 * const header = createAuthorizationHeader("agent_12345", "dGVzdA==");
 * // Returns: 'Signature keyId="agent_12345", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="dGVzdA=="'
 * ```
 */
export function createAuthorizationHeader(keyId: string, signature: string): string {
  // Visa TAP uses HTTP Signature format (RFC 9421)
  return `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signature}"`;
}
