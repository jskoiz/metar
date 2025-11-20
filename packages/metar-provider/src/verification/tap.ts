import { Request } from "express";
import { AgentKey } from "@metar/shared-types";
import { parseAuthorizationHeader } from "./parseHeaders.js";
import nacl from "tweetnacl";

// Agent key registry interface (will be implemented in branch 21)
export interface AgentKeyRegistry {
  lookupAgentKey(keyId: string): Promise<AgentKey | null>;
}

/**
 * Reconstructs the signature base string from an Express request.
 *
 * The base string is constructed from the following headers in order:
 * - (request-target): HTTP method and path with query string
 * - date: Request date header
 * - x-meter-nonce: Unique nonce value
 * - x-meter-tx: Payment transaction signature
 *
 * @param req - Express request object
 * @param authParams - Parsed authorization header parameters
 * @returns The signature base string
 */
export function reconstructSignatureBaseString(
  req: Request,
  _authParams: { headers: string[] }
): string {
  const method = req.method.toLowerCase();
  
  // Reconstruct path: use req.path and only add query string if it exists and is not empty
  let path = req.path;
  if (req.query && Object.keys(req.query).length > 0) {
    const queryString = new URLSearchParams(req.query as any).toString();
    if (queryString) {
      path = `${path}?${queryString}`;
    }
  }
  
  const date = req.headers.date as string;
  const nonce = req.headers["x-meter-nonce"] as string;
  const txSig = req.headers["x-meter-tx"] as string;

  return [
    `(request-target): ${method} ${path}`,
    `date: ${date}`,
    `x-meter-nonce: ${nonce}`,
    `x-meter-tx: ${txSig}`,
  ].join("\n");
}

/**
 * Decodes a public key from base58 or base64 format.
 *
 * Tries base64 first (standard), then base58 if available.
 *
 * @param publicKey - Public key string in base58 or base64 format
 * @returns Decoded public key as Uint8Array
 * @throws Error if the public key cannot be decoded
 */
function decodePublicKey(publicKey: string): Uint8Array {
  // Try base64 first (standard format)
  try {
    const decoded = Buffer.from(publicKey, "base64");
    if (decoded.length === 32) {
      // ed25519 public keys are 32 bytes
      return new Uint8Array(decoded);
    }
  } catch {
    // Not base64, try base58
  }

  // Try base58 (requires bs58 library)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bs58 = require("bs58");
    const decoded = bs58.decode(publicKey);
    if (decoded.length === 32) {
      return new Uint8Array(decoded);
    }
  } catch {
    // bs58 not available or invalid base58
  }

  throw new Error(
    `Invalid public key format: expected base64 or base58 encoded 32-byte ed25519 public key`
  );
}

/**
 * Verifies an agent signature using the Trusted Agent Protocol (TAP).
 *
 * This function implements HTTP Signature verification (RFC 9421) as specified
 * by Visa TAP. It:
 * 1. Parses the Authorization header (HTTP Signature format)
 * 2. Looks up the agent key from the registry
 * 3. Checks if the key has expired
 * 4. Reconstructs the signature base string
 * 5. Verifies the cryptographic signature using ed25519
 *
 * @param req - Express request object
 * @param agentKeyId - Agent key identifier (from x-meter-agent-kid header)
 * @param registry - Agent key registry for looking up public keys
 * @returns true if signature is valid, false otherwise
 */
export async function verifyAgentSignature(
  req: Request,
  agentKeyId: string,
  registry: AgentKeyRegistry
): Promise<boolean> {
  const debugEnabled = process.env.DEBUG_TAP === "true";
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Signature ")) {
    if (debugEnabled) {
      console.log("[TAP DEBUG] No valid Authorization header");
    }
    return false;
  }

  // Parse the HTTP Signature header
  const authParams = parseAuthorizationHeader(authHeader);
  if (!authParams) {
    if (debugEnabled) {
      console.log("[TAP DEBUG] Failed to parse Authorization header");
    }
    return false;
  }

  if (debugEnabled) {
    console.log("[TAP DEBUG] Parsed auth params:", {
      keyId: authParams.keyId,
      algorithm: authParams.algorithm,
      headers: authParams.headers,
      signatureLength: authParams.signature.length,
    });
  }

  // Verify keyId matches
  if (authParams.keyId !== agentKeyId) {
    if (debugEnabled) {
      console.log(`[TAP DEBUG] KeyId mismatch: expected "${agentKeyId}", got "${authParams.keyId}"`);
    }
    return false;
  }

  // Verify algorithm is ed25519
  if (authParams.algorithm !== "ed25519") {
    if (debugEnabled) {
      console.log(`[TAP DEBUG] Algorithm mismatch: expected "ed25519", got "${authParams.algorithm}"`);
    }
    return false;
  }

  // Verify headers list matches expected TAP headers
  const expectedHeaders = ["(request-target)", "date", "x-meter-nonce", "x-meter-tx"];
  if (authParams.headers.length !== expectedHeaders.length) {
    if (debugEnabled) {
      console.log(`[TAP DEBUG] Headers length mismatch: expected ${expectedHeaders.length}, got ${authParams.headers.length}`);
    }
    return false;
  }
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (authParams.headers[i] !== expectedHeaders[i]) {
      if (debugEnabled) {
        console.log(`[TAP DEBUG] Header mismatch at index ${i}: expected "${expectedHeaders[i]}", got "${authParams.headers[i]}"`);
      }
      return false;
    }
  }

  // Lookup agent key from registry
  const agentKey = await registry.lookupAgentKey(agentKeyId);
  if (!agentKey) {
    if (debugEnabled) {
      console.log(`[TAP DEBUG] Agent key not found in registry for keyId: ${agentKeyId}`);
    }
    return false;
  }

  if (debugEnabled) {
    console.log("[TAP DEBUG] Found agent key:", {
      keyId: agentKey.keyId,
      publicKeyLength: agentKey.publicKey.length,
      publicKeyPreview: agentKey.publicKey.substring(0, 20) + "...",
    });
  }

  // Check expiration (expiresAt is in milliseconds, Date.now() returns milliseconds)
  if (agentKey.expiresAt && agentKey.expiresAt < Date.now()) {
    if (debugEnabled) {
      console.log(`[TAP DEBUG] Agent key expired: expiresAt=${agentKey.expiresAt}, now=${Date.now()}`);
    }
    return false;
  }

  // Decode the public key (supports both base58 and base64)
  let publicKey: Uint8Array;
  try {
    publicKey = decodePublicKey(agentKey.publicKey);
    if (debugEnabled) {
      console.log("[TAP DEBUG] Successfully decoded public key, length:", publicKey.length);
    }
  } catch (error) {
    if (debugEnabled) {
      console.log("[TAP DEBUG] Failed to decode public key:", error);
    }
    return false;
  }

  // Reconstruct the signature base string
  const baseString = reconstructSignatureBaseString(req, authParams);
  if (debugEnabled) {
    console.log("[TAP DEBUG] Reconstructed base string:");
    console.log(baseString.split("\n").map((line, i) => `  ${i + 1}. ${line}`).join("\n"));
  }

  // Verify the signature
  const message = new TextEncoder().encode(baseString);
  const sigBytes = Buffer.from(authParams.signature, "base64");
  if (debugEnabled) {
    console.log("[TAP DEBUG] Signature bytes length:", sigBytes.length);
  }

  const isValid = nacl.sign.detached.verify(message, sigBytes, publicKey);
  if (debugEnabled) {
    console.log(`[TAP DEBUG] Signature verification result: ${isValid ? "✅ VALID" : "❌ INVALID"}`);
  }
  
  return isValid;
}
