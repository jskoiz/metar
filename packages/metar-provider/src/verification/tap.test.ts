/**
 * Unit tests for TAP signature verification functions.
 *
 * Tests signature base string reconstruction and agent signature verification.
 * Uses known test vectors for deterministic testing.
 */

import { test } from "node:test";
import assert from "node:assert";
import nacl from "tweetnacl";
import { Request } from "express";
import { AgentKey } from "@metar/shared-types";
import { reconstructSignatureBaseString, verifyAgentSignature, AgentKeyRegistry } from "./tap.js";

// Known test vector: Fixed keypair seed for deterministic testing
const TEST_KEYPAIR_SEED = new Uint8Array([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
  0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
]);

// Generate keypair from seed
const TEST_KEYPAIR = nacl.sign.keyPair.fromSeed(TEST_KEYPAIR_SEED);

// Mock Express Request object
function createMockRequest(
  method: string,
  path: string,
  headers: Record<string, string | string[] | undefined>,
  query?: Record<string, string>
): Request {
  return {
    method,
    path,
    query: query || {},
    headers,
  } as Request;
}

// Mock AgentKeyRegistry
class MockAgentKeyRegistry implements AgentKeyRegistry {
  private keys: Map<string, AgentKey> = new Map();

  addKey(key: AgentKey): void {
    this.keys.set(key.keyId, key);
  }

  async lookupAgentKey(keyId: string): Promise<AgentKey | null> {
    return this.keys.get(keyId) || null;
  }
}

test("reconstructSignatureBaseString - creates correct base string", () => {
  const req = createMockRequest("GET", "/api/summarize", {
    date: "Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-tx": "5j7s8K9abcdef123456",
  });

  const authParams = {
    headers: ["(request-target)", "date", "x-meter-nonce", "x-meter-tx"],
  };

  const baseString = reconstructSignatureBaseString(req, authParams);

  const expected = [
    "(request-target): get /api/summarize",
    "date: Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce: 018e1234-5678-9abc-def0-123456789abc",
    "x-meter-tx: 5j7s8K9abcdef123456",
  ].join("\n");

  assert.strictEqual(baseString, expected);
});

test("reconstructSignatureBaseString - includes query string", () => {
  const req = createMockRequest(
    "GET",
    "/api/summarize",
    {
      date: "Mon, 01 Jan 2024 12:00:00 GMT",
      "x-meter-nonce": "test-nonce",
      "x-meter-tx": "test-tx",
    },
    { text: "hello", lang: "en" }
  );

  const authParams = {
    headers: ["(request-target)", "date", "x-meter-nonce", "x-meter-tx"],
  };

  const baseString = reconstructSignatureBaseString(req, authParams);

  assert.ok(baseString.includes("(request-target): get /api/summarize?"));
  assert.ok(baseString.includes("text=hello"));
  assert.ok(baseString.includes("lang=en"));
});

test("reconstructSignatureBaseString - lowercases HTTP method", () => {
  const req = createMockRequest("POST", "/api/payment", {
    date: "Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce": "test-nonce",
    "x-meter-tx": "test-tx",
  });

  const authParams = {
    headers: ["(request-target)", "date", "x-meter-nonce", "x-meter-tx"],
  };

  const baseString = reconstructSignatureBaseString(req, authParams);

  assert.ok(baseString.includes("(request-target): post /api/payment"));
});

test("reconstructSignatureBaseString - handles different HTTP methods", () => {
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

  methods.forEach(method => {
    const req = createMockRequest(method, "/api/test", {
      date: "Mon, 01 Jan 2024 12:00:00 GMT",
      "x-meter-nonce": "test-nonce",
      "x-meter-tx": "test-tx",
    });

    const authParams = {
      headers: ["(request-target)", "date", "x-meter-nonce", "x-meter-tx"],
    };

    const baseString = reconstructSignatureBaseString(req, authParams);

    assert.ok(baseString.includes(`(request-target): ${method.toLowerCase()} /api/test`));
  });
});

test("verifyAgentSignature - verifies valid signature", async () => {
  const keyId = "agent_12345";
  const publicKeyBase64 = Buffer.from(TEST_KEYPAIR.publicKey).toString("base64");

  // Create a valid signature
  const method = "GET";
  const path = "/api/summarize";
  const date = "Mon, 01 Jan 2024 12:00:00 GMT";
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const txSig = "5j7s8K9abcdef123456";

  const baseString = [
    `(request-target): ${method} ${path}`,
    `date: ${date}`,
    `x-meter-nonce: ${nonce}`,
    `x-meter-tx: ${txSig}`,
  ].join("\n");

  const message = new TextEncoder().encode(baseString);
  const signature = nacl.sign.detached(message, TEST_KEYPAIR.secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");

  const req = createMockRequest(method, path, {
    date,
    "x-meter-nonce": nonce,
    "x-meter-tx": txSig,
    authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signatureBase64}"`,
  });

  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: publicKeyBase64,
    algorithm: "ed25519",
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.ok(isValid, "Signature should be valid");
});

test("verifyAgentSignature - rejects invalid signature", async () => {
  const keyId = "agent_12345";
  const publicKeyBase64 = Buffer.from(TEST_KEYPAIR.publicKey).toString("base64");

  const req = createMockRequest("GET", "/api/summarize", {
    date: "Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-tx": "5j7s8K9abcdef123456",
    authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="invalid-signature"`,
  });

  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: publicKeyBase64,
    algorithm: "ed25519",
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.strictEqual(isValid, false, "Invalid signature should be rejected");
});

test("verifyAgentSignature - rejects request without authorization header", async () => {
  const keyId = "agent_12345";

  const req = createMockRequest("GET", "/api/summarize", {
    date: "Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-tx": "5j7s8K9abcdef123456",
  });

  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: Buffer.from(TEST_KEYPAIR.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.strictEqual(isValid, false, "Request without authorization header should be rejected");
});

test("verifyAgentSignature - rejects request with invalid authorization header", async () => {
  const keyId = "agent_12345";

  const req = createMockRequest("GET", "/api/summarize", {
    date: "Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-tx": "5j7s8K9abcdef123456",
    authorization: "Bearer token123",
  });

  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: Buffer.from(TEST_KEYPAIR.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.strictEqual(isValid, false, "Invalid authorization header should be rejected");
});

test("verifyAgentSignature - rejects when agent key not found", async () => {
  const keyId = "agent_12345";

  const req = createMockRequest("GET", "/api/summarize", {
    date: "Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-tx": "5j7s8K9abcdef123456",
    authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="test"`,
  });

  const registry = new MockAgentKeyRegistry();
  // Don't add the key

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.strictEqual(isValid, false, "Missing agent key should be rejected");
});

test("verifyAgentSignature - rejects expired agent key", async () => {
  const keyId = "agent_12345";
  const publicKeyBase64 = Buffer.from(TEST_KEYPAIR.publicKey).toString("base64");

  const req = createMockRequest("GET", "/api/summarize", {
    date: "Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce": "018e1234-5678-9abc-def0-123456789abc",
    "x-meter-tx": "5j7s8K9abcdef123456",
    authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="test"`,
  });

  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: publicKeyBase64,
    algorithm: "ed25519",
    expiresAt: Date.now() - 1000, // Expired 1 second ago
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.strictEqual(isValid, false, "Expired agent key should be rejected");
});

test("verifyAgentSignature - accepts non-expired agent key", async () => {
  const keyId = "agent_12345";
  const publicKeyBase64 = Buffer.from(TEST_KEYPAIR.publicKey).toString("base64");

  // Create a valid signature
  const method = "GET";
  const path = "/api/summarize";
  const date = "Mon, 01 Jan 2024 12:00:00 GMT";
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const txSig = "5j7s8K9abcdef123456";

  const baseString = [
    `(request-target): ${method} ${path}`,
    `date: ${date}`,
    `x-meter-nonce: ${nonce}`,
    `x-meter-tx: ${txSig}`,
  ].join("\n");

  const message = new TextEncoder().encode(baseString);
  const signature = nacl.sign.detached(message, TEST_KEYPAIR.secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");

  const req = createMockRequest(method, path, {
    date,
    "x-meter-nonce": nonce,
    "x-meter-tx": txSig,
    authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signatureBase64}"`,
  });

  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: publicKeyBase64,
    algorithm: "ed25519",
    expiresAt: Date.now() + 3600000, // Expires in 1 hour
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.ok(isValid, "Non-expired agent key should be accepted");
});

test("verifyAgentSignature - handles base58 encoded public key", async () => {
  const keyId = "agent_12345";

  // Encode public key as base58
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bs58 = require("bs58");
  const publicKeyBase58 = bs58.encode(TEST_KEYPAIR.publicKey);

  // Create a valid signature
  const method = "GET";
  const path = "/api/summarize";
  const date = "Mon, 01 Jan 2024 12:00:00 GMT";
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const txSig = "5j7s8K9abcdef123456";

  const baseString = [
    `(request-target): ${method} ${path}`,
    `date: ${date}`,
    `x-meter-nonce: ${nonce}`,
    `x-meter-tx: ${txSig}`,
  ].join("\n");

  const message = new TextEncoder().encode(baseString);
  const signature = nacl.sign.detached(message, TEST_KEYPAIR.secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");

  const req = createMockRequest(method, path, {
    date,
    "x-meter-nonce": nonce,
    "x-meter-tx": txSig,
    authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signatureBase64}"`,
  });

  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: publicKeyBase58,
    algorithm: "ed25519",
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.ok(isValid, "Base58 encoded public key should be accepted");
});

test("verifyAgentSignature - rejects tampered request", async () => {
  const keyId = "agent_12345";
  const publicKeyBase64 = Buffer.from(TEST_KEYPAIR.publicKey).toString("base64");

  // Create signature for original request
  const method = "GET";
  const path = "/api/summarize";
  const date = "Mon, 01 Jan 2024 12:00:00 GMT";
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const txSig = "5j7s8K9abcdef123456";

  const baseString = [
    `(request-target): ${method} ${path}`,
    `date: ${date}`,
    `x-meter-nonce: ${nonce}`,
    `x-meter-tx: ${txSig}`,
  ].join("\n");

  const message = new TextEncoder().encode(baseString);
  const signature = nacl.sign.detached(message, TEST_KEYPAIR.secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");

  // Tamper with the request (change the path)
  const req = createMockRequest(method, "/api/tampered", {
    date,
    "x-meter-nonce": nonce,
    "x-meter-tx": txSig,
    authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signatureBase64}"`,
  });

  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: publicKeyBase64,
    algorithm: "ed25519",
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.strictEqual(isValid, false, "Tampered request should be rejected");
});

test("end-to-end: complete verification flow", async () => {
  const keyId = "agent_12345";
  const publicKeyBase64 = Buffer.from(TEST_KEYPAIR.publicKey).toString("base64");

  // Step 1: Create request with all required headers
  const method = "POST";
  const path = "/api/summarize";
  const date = "Mon, 01 Jan 2024 12:00:00 GMT";
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const txSig = "5j7s8K9abcdef123456";

  // Step 2: Construct base string (as client would)
  const baseString = [
    `(request-target): ${method} ${path}`,
    `date: ${date}`,
    `x-meter-nonce: ${nonce}`,
    `x-meter-tx: ${txSig}`,
  ].join("\n");

  // Step 3: Sign the base string (as client would)
  const message = new TextEncoder().encode(baseString);
  const signature = nacl.sign.detached(message, TEST_KEYPAIR.secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");

  // Step 4: Create request with signature
  const req = createMockRequest(method, path, {
    date,
    "x-meter-nonce": nonce,
    "x-meter-tx": txSig,
    authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signatureBase64}"`,
  });

  // Step 5: Verify signature (as provider would)
  const registry = new MockAgentKeyRegistry();
  registry.addKey({
    keyId,
    publicKey: publicKeyBase64,
    algorithm: "ed25519",
  });

  const isValid = await verifyAgentSignature(req, keyId, registry);
  assert.ok(isValid, "End-to-end verification should succeed");
});
