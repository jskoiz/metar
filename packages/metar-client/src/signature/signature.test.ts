/**
 * Unit tests for TAP signature functions.
 *
 * Tests signature base string construction, request signing, and authorization header creation.
 * Uses known test vectors for deterministic testing.
 */

import { test } from "node:test";
import assert from "node:assert";
import nacl from "tweetnacl";
import { constructSignatureBaseString } from "./constructBaseString.js";
import { signRequest } from "./signRequest.js";
import { createAuthorizationHeader } from "./createAuthHeader.js";

// Known test vector: Fixed keypair seed for deterministic testing
const TEST_KEYPAIR_SEED = new Uint8Array([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
  0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
]);

// Generate keypair from seed
const TEST_KEYPAIR = nacl.sign.keyPair.fromSeed(TEST_KEYPAIR_SEED);

test("constructSignatureBaseString - creates correct base string", () => {
  const method = "GET";
  const path = "/api/summarize?text=hello";
  const date = "Mon, 01 Jan 2024 12:00:00 GMT";
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const txSig = "5j7s8K9...";

  const baseString = constructSignatureBaseString(method, path, date, nonce, txSig);

  const expected = [
    "(request-target): get /api/summarize?text=hello",
    "date: Mon, 01 Jan 2024 12:00:00 GMT",
    "x-meter-nonce: 018e1234-5678-9abc-def0-123456789abc",
    "x-meter-tx: 5j7s8K9...",
  ].join("\n");

  assert.strictEqual(baseString, expected);
});

test("constructSignatureBaseString - lowercases HTTP method", () => {
  const baseString = constructSignatureBaseString(
    "POST",
    "/api/payment",
    "Mon, 01 Jan 2024 12:00:00 GMT",
    "test-nonce",
    "test-tx"
  );

  assert.ok(baseString.includes("(request-target): post /api/payment"));
});

test("constructSignatureBaseString - handles different HTTP methods", () => {
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

  methods.forEach(method => {
    const baseString = constructSignatureBaseString(
      method,
      "/api/test",
      "Mon, 01 Jan 2024 12:00:00 GMT",
      "test-nonce",
      "test-tx"
    );

    assert.ok(baseString.includes(`(request-target): ${method.toLowerCase()} /api/test`));
  });
});

test("signRequest - signs base string correctly", () => {
  const baseString = constructSignatureBaseString(
    "GET",
    "/api/test",
    "Mon, 01 Jan 2024 12:00:00 GMT",
    "test-nonce-123",
    "test-tx-signature"
  );

  const signature = signRequest(TEST_KEYPAIR.secretKey, baseString);

  // Signature should be base64 encoded
  assert.strictEqual(typeof signature, "string");
  assert.ok(signature.length > 0);

  // Verify signature can be decoded
  const sigBytes = Buffer.from(signature, "base64");
  assert.strictEqual(sigBytes.length, 64); // ed25519 signatures are 64 bytes

  // Verify signature is valid
  const message = new TextEncoder().encode(baseString);
  const isValid = nacl.sign.detached.verify(message, sigBytes, TEST_KEYPAIR.publicKey);
  assert.ok(isValid, "Signature should be valid");
});

test("signRequest - produces deterministic signatures", () => {
  const baseString = "test base string";

  const signature1 = signRequest(TEST_KEYPAIR.secretKey, baseString);
  const signature2 = signRequest(TEST_KEYPAIR.secretKey, baseString);

  // Same input should produce same signature
  assert.strictEqual(signature1, signature2);
});

test("signRequest - produces different signatures for different inputs", () => {
  const baseString1 = "test base string 1";
  const baseString2 = "test base string 2";

  const signature1 = signRequest(TEST_KEYPAIR.secretKey, baseString1);
  const signature2 = signRequest(TEST_KEYPAIR.secretKey, baseString2);

  // Different inputs should produce different signatures
  assert.notStrictEqual(signature1, signature2);
});

test("createAuthorizationHeader - creates correct header format", () => {
  const keyId = "agent_12345";
  const signature = "dGVzdA==";

  const header = createAuthorizationHeader(keyId, signature);

  const expected = `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signature}"`;

  assert.strictEqual(header, expected);
});

test("createAuthorizationHeader - handles different keyIds", () => {
  const keyIds = ["agent_12345", "agent_67890", "test-agent-key"];

  keyIds.forEach(keyId => {
    const header = createAuthorizationHeader(keyId, "test-signature");
    assert.ok(header.includes(`keyId="${keyId}"`));
    assert.ok(header.includes('alg="ed25519"'));
    assert.ok(header.includes('headers="(request-target) date x-meter-nonce x-meter-tx"'));
  });
});

test("end-to-end: complete signature flow", () => {
  const method = "POST";
  const path = "/api/summarize";
  const date = "Mon, 01 Jan 2024 12:00:00 GMT";
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const txSig = "5j7s8K9abcdef123456";
  const keyId = "agent_12345";

  // Step 1: Construct base string
  const baseString = constructSignatureBaseString(method, path, date, nonce, txSig);
  assert.ok(baseString.length > 0);

  // Step 2: Sign the base string
  const signature = signRequest(TEST_KEYPAIR.secretKey, baseString);
  assert.ok(signature.length > 0);

  // Step 3: Create authorization header
  const authHeader = createAuthorizationHeader(keyId, signature);
  assert.ok(authHeader.includes(keyId));
  assert.ok(authHeader.includes(signature));
  assert.ok(authHeader.startsWith("Signature"));

  // Verify signature is valid
  const message = new TextEncoder().encode(baseString);
  const sigBytes = Buffer.from(signature, "base64");
  const isValid = nacl.sign.detached.verify(message, sigBytes, TEST_KEYPAIR.publicKey);
  assert.ok(isValid, "End-to-end signature should be valid");
});

test("signRequest - handles empty base string", () => {
  const signature = signRequest(TEST_KEYPAIR.secretKey, "");

  assert.strictEqual(typeof signature, "string");
  assert.ok(signature.length > 0);

  // Verify signature is valid even for empty string
  const message = new TextEncoder().encode("");
  const sigBytes = Buffer.from(signature, "base64");
  const isValid = nacl.sign.detached.verify(message, sigBytes, TEST_KEYPAIR.publicKey);
  assert.ok(isValid);
});

test("constructSignatureBaseString - preserves special characters in path", () => {
  const path = "/api/test?param=value&other=test%20value";
  const baseString = constructSignatureBaseString(
    "GET",
    path,
    "Mon, 01 Jan 2024 12:00:00 GMT",
    "test-nonce",
    "test-tx"
  );

  assert.ok(baseString.includes(path));
});

test("constructSignatureBaseString - preserves all header values exactly", () => {
  const date = "Mon, 01 Jan 2024 12:00:00 GMT";
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const txSig = "5j7s8K9...";

  const baseString = constructSignatureBaseString("GET", "/test", date, nonce, txSig);

  assert.ok(baseString.includes(`date: ${date}`));
  assert.ok(baseString.includes(`x-meter-nonce: ${nonce}`));
  assert.ok(baseString.includes(`x-meter-tx: ${txSig}`));
});
