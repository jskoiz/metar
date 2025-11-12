import nacl from "tweetnacl";
import { Request } from "express";
import { AgentKey } from "@meter/shared-types";
import { parseAuthorizationHeader } from "./parseHeaders.js";

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
  authParams: { headers: string[] }
): string {
  const method = req.method.toLowerCase();
  const path = req.path + (req.query ? `?${new URLSearchParams(req.query as any).toString()}` : "");
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

  throw new Error(`Invalid public key format: expected base64 or base58 encoded 32-byte ed25519 public key`);
}

/**
 * Verifies an agent signature using the Trusted Agent Protocol (TAP).
 * 
 * This function:
 * 1. Parses the Authorization header
 * 2. Looks up the agent key from the registry
 * 3. Checks if the key has expired
 * 4. Reconstructs the signature base string
 * 5. Verifies the cryptographic signature
 * 
 * @param req - Express request object
 * @param agentKeyId - Agent key identifier (from x-meter-agent-kid header or auth header)
 * @param registry - Agent key registry for looking up public keys
 * @returns true if signature is valid, false otherwise
 */
export async function verifyAgentSignature(
  req: Request,
  agentKeyId: string,
  registry: AgentKeyRegistry
): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  const authParams = parseAuthorizationHeader(authHeader);
  if (!authParams) return false;

  const agentKey = await registry.lookupAgentKey(agentKeyId);
  if (!agentKey) return false;

  // Check expiration (expiresAt is in milliseconds, Date.now() returns milliseconds)
  if (agentKey.expiresAt && agentKey.expiresAt < Date.now()) {
    return false;
  }

  // Reconstruct the signature base string
  const baseString = reconstructSignatureBaseString(req, authParams);

  // Decode the public key (supports both base58 and base64)
  let publicKey: Uint8Array;
  try {
    publicKey = decodePublicKey(agentKey.publicKey);
  } catch {
    return false;
  }

  // Verify the signature
  const message = new TextEncoder().encode(baseString);
  const signature = Buffer.from(authParams.signature, "base64");

  return nacl.sign.detached.verify(message, signature, publicKey);
}

