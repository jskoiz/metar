import { Request } from "express";
import { PaymentHeaders } from "@metar/shared-types";

/**
 * Parses payment headers from an Express request.
 *
 * Extracts and validates all required x-meter-* headers from the request.
 * Returns null if any required header is missing or invalid.
 *
 * @param req - Express request object
 * @returns Parsed PaymentHeaders object or null if headers are invalid
 */
export function parsePaymentHeaders(req: Request): PaymentHeaders | null {
  const txSig = req.headers["x-meter-tx"] as string;
  const routeId = req.headers["x-meter-route"] as string;
  const amount = parseFloat(req.headers["x-meter-amt"] as string);
  const currency = req.headers["x-meter-currency"] as string;
  const nonce = req.headers["x-meter-nonce"] as string;
  const timestamp = parseInt(req.headers["x-meter-ts"] as string);
  const agentKeyId = req.headers["x-meter-agent-kid"] as string;

  if (
    !txSig ||
    !routeId ||
    isNaN(amount) ||
    !currency ||
    !nonce ||
    isNaN(timestamp) ||
    !agentKeyId
  ) {
    return null;
  }

  return {
    txSig,
    routeId,
    amount,
    currency,
    nonce,
    timestamp,
    agentKeyId,
  };
}

/**
 * Parses the Authorization header containing a TAP signature.
 *
 * Extracts keyId, algorithm, headers list, and signature from a Signature
 * authorization header following the Trusted Agent Protocol format.
 *
 * @param header - The Authorization header value (e.g., "Signature keyId=...")
 * @returns Parsed signature parameters or null if header is invalid
 */
export function parseAuthorizationHeader(header: string): {
  keyId: string;
  algorithm: string;
  headers: string[];
  signature: string;
} | null {
  if (!header || !header.startsWith("Signature ")) {
    return null;
  }

  const match = header.match(/Signature\s+(.+)/);
  if (!match) return null;

  const params: Record<string, string> = {};
  match[1].split(",").forEach(param => {
    const trimmed = param.trim();
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) return;
    const key = trimmed.substring(0, equalIndex);
    let value = trimmed.substring(equalIndex + 1);
    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    params[key] = value;
  });

  return {
    keyId: params.keyId,
    algorithm: params.alg,
    headers: params.headers.split(" "),
    signature: params.signature,
  };
}
