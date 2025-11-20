/**
 * Unit tests for header parsing functions.
 *
 * Tests parsing of payment headers and authorization headers from Express requests.
 */

import { test } from "node:test";
import assert from "node:assert";
import { Request } from "express";
import { parsePaymentHeaders, parseAuthorizationHeader } from "./parseHeaders.js";

// Mock Express Request object
function createMockRequest(headers: Record<string, string | string[] | undefined>): Request {
  return {
    headers,
  } as Request;
}

test("parsePaymentHeaders - parses valid headers correctly", () => {
  const req = createMockRequest({
    "x-meter-tx": "5j7s8K9abcdef123456",
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "0.03",
    "x-meter-currency": "USDC",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "1704110400000",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);

  assert.ok(result !== null);
  assert.strictEqual(result!.txSig, "5j7s8K9abcdef123456");
  assert.strictEqual(result!.routeId, "summarize:v1");
  assert.strictEqual(result!.amount, 0.03);
  assert.strictEqual(result!.currency, "USDC");
  assert.strictEqual(result!.nonce, "018e1234-5678-9abc-def0-123456789abc");
  assert.strictEqual(result!.timestamp, 1704110400000);
  assert.strictEqual(result!.agentKeyId, "agent_12345");
});

test("parsePaymentHeaders - returns null when txSig is missing", () => {
  const req = createMockRequest({
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "0.03",
    "x-meter-currency": "USDC",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "1704110400000",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);
  assert.strictEqual(result, null);
});

test("parsePaymentHeaders - returns null when routeId is missing", () => {
  const req = createMockRequest({
    "x-meter-tx": "5j7s8K9abcdef123456",
    "x-meter-amt": "0.03",
    "x-meter-currency": "USDC",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "1704110400000",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);
  assert.strictEqual(result, null);
});

test("parsePaymentHeaders - returns null when amount is invalid", () => {
  const req = createMockRequest({
    "x-meter-tx": "5j7s8K9abcdef123456",
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "invalid",
    "x-meter-currency": "USDC",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "1704110400000",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);
  assert.strictEqual(result, null);
});

test("parsePaymentHeaders - returns null when currency is missing", () => {
  const req = createMockRequest({
    "x-meter-tx": "5j7s8K9abcdef123456",
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "0.03",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "1704110400000",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);
  assert.strictEqual(result, null);
});

test("parsePaymentHeaders - returns null when nonce is missing", () => {
  const req = createMockRequest({
    "x-meter-tx": "5j7s8K9abcdef123456",
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "0.03",
    "x-meter-currency": "USDC",
    "x-meter-ts": "1704110400000",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);
  assert.strictEqual(result, null);
});

test("parsePaymentHeaders - returns null when timestamp is invalid", () => {
  const req = createMockRequest({
    "x-meter-tx": "5j7s8K9abcdef123456",
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "0.03",
    "x-meter-currency": "USDC",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "invalid",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);
  assert.strictEqual(result, null);
});

test("parsePaymentHeaders - returns null when agentKeyId is missing", () => {
  const req = createMockRequest({
    "x-meter-tx": "5j7s8K9abcdef123456",
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "0.03",
    "x-meter-currency": "USDC",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "1704110400000",
  });

  const result = parsePaymentHeaders(req);
  assert.strictEqual(result, null);
});

test("parsePaymentHeaders - handles empty string headers", () => {
  const req = createMockRequest({
    "x-meter-tx": "",
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "0.03",
    "x-meter-currency": "USDC",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "1704110400000",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);
  assert.strictEqual(result, null);
});

test("parsePaymentHeaders - handles numeric amount correctly", () => {
  const req = createMockRequest({
    "x-meter-tx": "5j7s8K9abcdef123456",
    "x-meter-route": "summarize:v1",
    "x-meter-amt": "100.5",
    "x-meter-currency": "USDC",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-ts": "1704110400000",
    "x-meter-agent-kid": "agent_12345",
  });

  const result = parsePaymentHeaders(req);
  assert.ok(result !== null);
  assert.strictEqual(result!.amount, 100.5);
});

test("parseAuthorizationHeader - parses valid signature header", () => {
  const header =
    'Signature keyId="agent_12345", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="dGVzdA=="';

  const result = parseAuthorizationHeader(header);

  assert.ok(result !== null);
  assert.strictEqual(result!.keyId, "agent_12345");
  assert.strictEqual(result!.algorithm, "ed25519");
  assert.deepStrictEqual(result!.headers, [
    "(request-target)",
    "date",
    "x-meter-nonce",
    "x-meter-tx",
  ]);
  assert.strictEqual(result!.signature, "dGVzdA==");
});

test("parseAuthorizationHeader - returns null for non-Signature header", () => {
  const header = "Bearer token123";

  const result = parseAuthorizationHeader(header);
  assert.strictEqual(result, null);
});

test("parseAuthorizationHeader - returns null for empty string", () => {
  const result = parseAuthorizationHeader("");
  assert.strictEqual(result, null);
});

test("parseAuthorizationHeader - returns null for null/undefined", () => {
  assert.strictEqual(parseAuthorizationHeader(null as any), null);
  assert.strictEqual(parseAuthorizationHeader(undefined as any), null);
});

test("parseAuthorizationHeader - handles header without Signature prefix", () => {
  const header = 'keyId="agent_12345", alg="ed25519"';

  const result = parseAuthorizationHeader(header);
  assert.strictEqual(result, null);
});

test("parseAuthorizationHeader - handles different keyIds", () => {
  const keyIds = ["agent_12345", "agent_67890", "test-agent-key"];

  keyIds.forEach(keyId => {
    const header = `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date", signature="test"`;
    const result = parseAuthorizationHeader(header);

    assert.ok(result !== null);
    assert.strictEqual(result!.keyId, keyId);
  });
});

test("parseAuthorizationHeader - handles different algorithms", () => {
  const algorithms = ["ed25519", "rsa-sha256"];

  algorithms.forEach(alg => {
    const header = `Signature keyId="agent_123", alg="${alg}", headers="(request-target)", signature="test"`;
    const result = parseAuthorizationHeader(header);

    assert.ok(result !== null);
    assert.strictEqual(result!.algorithm, alg);
  });
});

test("parseAuthorizationHeader - handles different header lists", () => {
  const headerLists = [
    "(request-target) date",
    "(request-target) date x-meter-nonce x-meter-tx",
    "(request-target)",
  ];

  headerLists.forEach(headerList => {
    const header = `Signature keyId="agent_123", alg="ed25519", headers="${headerList}", signature="test"`;
    const result = parseAuthorizationHeader(header);

    assert.ok(result !== null);
    assert.deepStrictEqual(result!.headers, headerList.split(" "));
  });
});

test("parseAuthorizationHeader - handles headers with extra spaces", () => {
  const header =
    'Signature keyId="agent_12345" , alg="ed25519" , headers="(request-target) date" , signature="test"';

  const result = parseAuthorizationHeader(header);

  assert.ok(result !== null);
  assert.strictEqual(result!.keyId, "agent_12345");
  assert.strictEqual(result!.algorithm, "ed25519");
});

test("parseAuthorizationHeader - handles quoted values correctly", () => {
  const header =
    'Signature keyId="agent_12345", alg="ed25519", headers="(request-target) date", signature="dGVzdA=="';

  const result = parseAuthorizationHeader(header);

  assert.ok(result !== null);
  // Quotes should be stripped
  assert.strictEqual(result!.keyId, "agent_12345");
  assert.strictEqual(result!.signature, "dGVzdA==");
});
