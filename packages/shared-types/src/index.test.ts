/**
 * Type validation tests for shared types.
 *
 * These tests verify that objects conform to the expected interface structures
 * and validate required fields, optional fields, and type constraints.
 */

import type {
  PriceResponse,
  PaymentHeaders,
  PaymentRequiredResponse,
  UsageRecord,
  AgentKey,
  NonceRecord,
  PaymentMemo,
} from "./index.js";

/**
 * Type guard to validate PriceResponse
 */
function isValidPriceResponse(obj: unknown): obj is PriceResponse {
  if (typeof obj !== "object" || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.price === "number" &&
    typeof p.currency === "string" &&
    typeof p.mint === "string" &&
    typeof p.payTo === "string" &&
    typeof p.routeId === "string" &&
    typeof p.chain === "string" &&
    (p.priceSig === undefined || typeof p.priceSig === "string") &&
    (p.expiresAt === undefined || typeof p.expiresAt === "number")
  );
}

/**
 * Type guard to validate PaymentHeaders
 */
function isValidPaymentHeaders(obj: unknown): obj is PaymentHeaders {
  if (typeof obj !== "object" || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.txSig === "string" &&
    typeof p.routeId === "string" &&
    typeof p.amount === "number" &&
    typeof p.currency === "string" &&
    typeof p.nonce === "string" &&
    typeof p.timestamp === "number" &&
    typeof p.agentKeyId === "string"
  );
}

/**
 * Type guard to validate PaymentRequiredResponse
 */
function isValidPaymentRequiredResponse(obj: unknown): obj is PaymentRequiredResponse {
  if (typeof obj !== "object" || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    p.error === "Payment Required" &&
    typeof p.route === "string" &&
    typeof p.amount === "number" &&
    typeof p.currency === "string" &&
    typeof p.payTo === "string" &&
    typeof p.mint === "string" &&
    typeof p.chain === "string" &&
    (p.message === undefined || typeof p.message === "string") &&
    (p.tips === undefined ||
      (Array.isArray(p.tips) && p.tips.every(tip => typeof tip === "string")))
  );
}

/**
 * Type guard to validate UsageRecord
 */
function isValidUsageRecord(obj: unknown): obj is UsageRecord {
  if (typeof obj !== "object" || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.routeId === "string" &&
    typeof p.txSig === "string" &&
    typeof p.payer === "string" &&
    typeof p.amount === "number" &&
    typeof p.timestamp === "number" &&
    typeof p.nonce === "string" &&
    (p.status === "authorized" || p.status === "consumed" || p.status === "refunded") &&
    (p.reqHash === undefined || typeof p.reqHash === "string") &&
    (p.agentKeyId === undefined || typeof p.agentKeyId === "string")
  );
}

/**
 * Type guard to validate AgentKey
 */
function isValidAgentKey(obj: unknown): obj is AgentKey {
  if (typeof obj !== "object" || obj === null) return false;
  const p = obj as Record<string, unknown>;
  if (typeof p.keyId !== "string" || typeof p.publicKey !== "string" || p.algorithm !== "ed25519") {
    return false;
  }
  if (p.expiresAt !== undefined && typeof p.expiresAt !== "number") {
    return false;
  }
  if (p.metadata !== undefined) {
    if (typeof p.metadata !== "object" || p.metadata === null) return false;
    const m = p.metadata as Record<string, unknown>;
    if (
      (m.agentName !== undefined && typeof m.agentName !== "string") ||
      (m.issuer !== undefined && typeof m.issuer !== "string") ||
      (m.capabilities !== undefined &&
        (!Array.isArray(m.capabilities) || !m.capabilities.every(cap => typeof cap === "string")))
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Type guard to validate NonceRecord
 */
function isValidNonceRecord(obj: unknown): obj is NonceRecord {
  if (typeof obj !== "object" || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.nonce === "string" &&
    typeof p.agentKeyId === "string" &&
    typeof p.timestamp === "number" &&
    typeof p.consumed === "boolean"
  );
}

/**
 * Type guard to validate PaymentMemo
 */
function isValidPaymentMemo(obj: unknown): obj is PaymentMemo {
  if (typeof obj !== "object" || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.providerId === "string" &&
    typeof p.routeId === "string" &&
    typeof p.nonce === "string" &&
    typeof p.amount === "number" &&
    (p.timestamp === undefined || typeof p.timestamp === "number")
  );
}

/**
 * Test runner
 */
function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✓ ${name}`);
      return true;
    } else {
      console.error(`✗ ${name}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ ${name}: ${error}`);
    return false;
  }
}

// Test cases
let passed = 0;
let failed = 0;

// Test PriceResponse
const validPriceResponse: PriceResponse = {
  price: 0.03,
  currency: "USDC",
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
  routeId: "summarize:v1",
  chain: "solana",
};

if (test("PriceResponse - valid object", () => isValidPriceResponse(validPriceResponse))) {
  passed++;
} else {
  failed++;
}

if (
  test("PriceResponse - with optional fields", () =>
    isValidPriceResponse({
      ...validPriceResponse,
      priceSig: "signature",
      expiresAt: Date.now() + 60000,
    }))
) {
  passed++;
} else {
  failed++;
}

if (
  test("PriceResponse - invalid (missing required)", () => !isValidPriceResponse({ price: 0.03 }))
) {
  passed++;
} else {
  failed++;
}

// Test PaymentHeaders
const validPaymentHeaders: PaymentHeaders = {
  txSig: "5j7s8K9...",
  routeId: "summarize:v1",
  amount: 0.03,
  currency: "USDC",
  nonce: "018e1234-5678-9abc-def0-123456789abc",
  timestamp: Date.now(),
  agentKeyId: "agent_12345",
};

if (test("PaymentHeaders - valid object", () => isValidPaymentHeaders(validPaymentHeaders))) {
  passed++;
} else {
  failed++;
}

if (
  test("PaymentHeaders - invalid (wrong type)", () =>
    !isValidPaymentHeaders({ ...validPaymentHeaders, amount: "0.03" }))
) {
  passed++;
} else {
  failed++;
}

// Test PaymentRequiredResponse
const validPaymentRequired: PaymentRequiredResponse = {
  error: "Payment Required",
  route: "summarize:v1",
  amount: 0.03,
  currency: "USDC",
  payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  chain: "solana",
};

if (
  test("PaymentRequiredResponse - valid object", () =>
    isValidPaymentRequiredResponse(validPaymentRequired))
) {
  passed++;
} else {
  failed++;
}

if (
  test("PaymentRequiredResponse - with optional fields", () =>
    isValidPaymentRequiredResponse({
      ...validPaymentRequired,
      message: "Payment required",
      tips: ["Tip 1", "Tip 2"],
    }))
) {
  passed++;
} else {
  failed++;
}

if (
  test("PaymentRequiredResponse - invalid error", () =>
    !isValidPaymentRequiredResponse({
      ...validPaymentRequired,
      error: "Invalid",
    }))
) {
  passed++;
} else {
  failed++;
}

// Test UsageRecord
const validUsageRecord: UsageRecord = {
  id: "018e1234-5678-9abc-def0-123456789abc",
  routeId: "summarize:v1",
  txSig: "5j7s8K9...",
  payer: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
  amount: 0.03,
  timestamp: Date.now(),
  nonce: "018e1234-5678-9abc-def0-123456789abc",
  status: "authorized",
};

if (test("UsageRecord - valid object", () => isValidUsageRecord(validUsageRecord))) {
  passed++;
} else {
  failed++;
}

if (
  test("UsageRecord - all status values", () => {
    const statuses: Array<"authorized" | "consumed" | "refunded"> = [
      "authorized",
      "consumed",
      "refunded",
    ];
    return statuses.every(
      status =>
        isValidUsageRecord({ ...validUsageRecord, status }) &&
        !isValidUsageRecord({ ...validUsageRecord, status: "invalid" as any })
    );
  })
) {
  passed++;
} else {
  failed++;
}

if (
  test("UsageRecord - with optional fields", () =>
    isValidUsageRecord({
      ...validUsageRecord,
      reqHash: "hash",
      agentKeyId: "agent_12345",
    }))
) {
  passed++;
} else {
  failed++;
}

// Test AgentKey
const validAgentKey: AgentKey = {
  keyId: "agent_12345",
  publicKey: "base58orBase64Key",
  algorithm: "ed25519",
};

if (test("AgentKey - valid object", () => isValidAgentKey(validAgentKey))) {
  passed++;
} else {
  failed++;
}

if (
  test("AgentKey - with optional fields", () =>
    isValidAgentKey({
      ...validAgentKey,
      expiresAt: Date.now() + 3600000,
      metadata: {
        agentName: "Test Agent",
        issuer: "example.com",
        capabilities: ["read", "write"],
      },
    }))
) {
  passed++;
} else {
  failed++;
}

if (
  test("AgentKey - invalid algorithm", () =>
    !isValidAgentKey({ ...validAgentKey, algorithm: "rsa" as any }))
) {
  passed++;
} else {
  failed++;
}

// Test NonceRecord
const validNonceRecord: NonceRecord = {
  nonce: "018e1234-5678-9abc-def0-123456789abc",
  agentKeyId: "agent_12345",
  timestamp: Date.now(),
  consumed: false,
};

if (test("NonceRecord - valid object", () => isValidNonceRecord(validNonceRecord))) {
  passed++;
} else {
  failed++;
}

if (
  test("NonceRecord - consumed true", () =>
    isValidNonceRecord({ ...validNonceRecord, consumed: true }))
) {
  passed++;
} else {
  failed++;
}

// Test PaymentMemo
const validPaymentMemo: PaymentMemo = {
  providerId: "example.com",
  routeId: "summarize:v1",
  nonce: "018e1234-5678-9abc-def0-123456789abc",
  amount: 0.03,
};

if (test("PaymentMemo - valid object", () => isValidPaymentMemo(validPaymentMemo))) {
  passed++;
} else {
  failed++;
}

if (
  test("PaymentMemo - with optional timestamp", () =>
    isValidPaymentMemo({ ...validPaymentMemo, timestamp: Date.now() }))
) {
  passed++;
} else {
  failed++;
}

// Summary
console.log("\n--- Test Summary ---");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
