import nacl from "tweetnacl";

/**
 * Encodes a string or buffer to Base64URL format.
 */
function base64UrlEncode(input: Uint8Array | string): string {
  let buffer: Buffer;
  if (typeof input === "string") {
    buffer = Buffer.from(input, "utf-8");
  } else {
    buffer = Buffer.from(input);
  }
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Creates a Compact JWS signed with Ed25519.
 *
 * Format: header.payload.signature
 * Header: { "alg": "EdDSA", "kid": keyId, "typ": "JWT" }
 */
export function createJWS(
  payload: Record<string, any>,
  privateKey: Uint8Array,
  keyId: string
): string {
  const header = {
    alg: "EdDSA",
    kid: keyId,
    typ: "JWT",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = nacl.sign.detached(new TextEncoder().encode(signingInput), privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}
