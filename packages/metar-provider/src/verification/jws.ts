import nacl from "tweetnacl";

/**
 * Decodes a Base64URL string to a Buffer.
 */
function base64UrlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

/**
 * Verifies a Compact JWS signed with Ed25519.
 *
 * @returns The decoded payload if valid, null otherwise.
 */
export function verifyJWS(jws: string, publicKey: Uint8Array): Record<string, any> | null {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = base64UrlDecode(encodedSignature);
  const message = new TextEncoder().encode(signingInput);

  const isValid = nacl.sign.detached.verify(message, signature, publicKey);

  if (!isValid) {
    return null;
  }

  try {
    const payloadJson = base64UrlDecode(encodedPayload).toString("utf-8");
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}
