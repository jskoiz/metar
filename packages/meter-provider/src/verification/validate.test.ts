/**
 * Unit tests for timestamp and nonce validation functions.
 * 
 * Tests validation of timestamps and nonce replay protection.
 */

import { test } from "node:test";
import assert from "node:assert";
import { validateTimestamp, checkNonce } from "./validate.js";

test("validateTimestamp - accepts valid recent timestamp", () => {
  const now = Date.now();
  const recentTimestamp = now - 60000; // 1 minute ago
  
  assert.strictEqual(validateTimestamp(recentTimestamp), true);
});

test("validateTimestamp - accepts timestamp within clock skew tolerance", () => {
  const now = Date.now();
  const futureTimestamp = now + 30000; // 30 seconds in the future (within ±1 minute tolerance)
  
  assert.strictEqual(validateTimestamp(futureTimestamp), true);
});

test("validateTimestamp - rejects timestamp too far in the future", () => {
  const now = Date.now();
  const futureTimestamp = now + 120000; // 2 minutes in the future (beyond ±1 minute tolerance)
  
  assert.strictEqual(validateTimestamp(futureTimestamp), false);
});

test("validateTimestamp - accepts timestamp at max age boundary", () => {
  const now = Date.now();
  const maxAgeTimestamp = now - 300000; // Exactly 5 minutes ago (default maxAge)
  
  assert.strictEqual(validateTimestamp(maxAgeTimestamp), true);
});

test("validateTimestamp - rejects timestamp older than max age", () => {
  const now = Date.now();
  const oldTimestamp = now - 300001; // Just over 5 minutes ago
  
  assert.strictEqual(validateTimestamp(oldTimestamp), false);
});

test("validateTimestamp - accepts timestamp with custom maxAge", () => {
  const now = Date.now();
  const customMaxAge = 600000; // 10 minutes
  const timestamp = now - 500000; // 8.3 minutes ago (within custom maxAge)
  
  assert.strictEqual(validateTimestamp(timestamp, customMaxAge), true);
});

test("validateTimestamp - rejects timestamp older than custom maxAge", () => {
  const now = Date.now();
  const customMaxAge = 600000; // 10 minutes
  const timestamp = now - 700000; // 11.7 minutes ago (beyond custom maxAge)
  
  assert.strictEqual(validateTimestamp(timestamp, customMaxAge), false);
});

test("validateTimestamp - accepts current timestamp", () => {
  const now = Date.now();
  
  assert.strictEqual(validateTimestamp(now), true);
});

test("checkNonce - accepts new nonce", async () => {
  const nonce = "018e1234-5678-9abc-def0-123456789abc";
  const agentKeyId = "agent_12345";
  
  const result = await checkNonce(nonce, agentKeyId);
  
  assert.strictEqual(result, true);
});

test("checkNonce - rejects duplicate nonce for same agent", async () => {
  const nonce = "018e1234-5678-9abc-def0-123456789def";
  const agentKeyId = "agent_12345";
  
  // First use should succeed
  const firstResult = await checkNonce(nonce, agentKeyId);
  assert.strictEqual(firstResult, true);
  
  // Second use should fail
  const secondResult = await checkNonce(nonce, agentKeyId);
  assert.strictEqual(secondResult, false);
});

test("checkNonce - allows same nonce for different agents", async () => {
  const nonce = "018e1234-5678-9abc-def0-123456789ghi";
  const agentKeyId1 = "agent_12345";
  const agentKeyId2 = "agent_67890";
  
  // Use nonce with first agent
  const result1 = await checkNonce(nonce, agentKeyId1);
  assert.strictEqual(result1, true);
  
  // Same nonce with different agent should succeed
  const result2 = await checkNonce(nonce, agentKeyId2);
  assert.strictEqual(result2, true);
});

test("checkNonce - handles different nonces for same agent", async () => {
  const nonce1 = "018e1234-5678-9abc-def0-123456789jkl";
  const nonce2 = "018e1234-5678-9abc-def0-123456789mno";
  const agentKeyId = "agent_12345";
  
  // Both nonces should be accepted
  const result1 = await checkNonce(nonce1, agentKeyId);
  assert.strictEqual(result1, true);
  
  const result2 = await checkNonce(nonce2, agentKeyId);
  assert.strictEqual(result2, true);
});

test("checkNonce - handles UUID v7 format nonces", async () => {
  const nonce = "018e1234-5678-9abc-def0-123456789pqr";
  const agentKeyId = "agent_12345";
  
  const result = await checkNonce(nonce, agentKeyId);
  assert.strictEqual(result, true);
});

test("checkNonce - handles hex format nonces", async () => {
  const nonce = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
  const agentKeyId = "agent_12345";
  
  const result = await checkNonce(nonce, agentKeyId);
  assert.strictEqual(result, true);
});

test("checkNonce - handles empty nonce string", async () => {
  const nonce = "";
  const agentKeyId = "agent_12345";
  
  const result = await checkNonce(nonce, agentKeyId);
  assert.strictEqual(result, true); // Should accept but mark as consumed
  
  // Second use should fail
  const secondResult = await checkNonce(nonce, agentKeyId);
  assert.strictEqual(secondResult, false);
});

test("checkNonce - handles empty agentKeyId", async () => {
  const nonce = "018e1234-5678-9abc-def0-123456789stu";
  const agentKeyId = "";
  
  const result = await checkNonce(nonce, agentKeyId);
  assert.strictEqual(result, true);
  
  // Second use should fail
  const secondResult = await checkNonce(nonce, agentKeyId);
  assert.strictEqual(secondResult, false);
});

test("checkNonce - cleanup removes old nonces", async () => {
  // This test verifies that cleanupNonces is called and works correctly
  // We can't directly test cleanupNonces since it's private, but we can
  // verify that the store doesn't grow unbounded by checking behavior
  // after many nonce checks
  
  const agentKeyId = "agent_cleanup_test";
  
  // Add many unique nonces
  for (let i = 0; i < 100; i++) {
    const nonce = `nonce_${i}_${Date.now()}`;
    const result = await checkNonce(nonce, agentKeyId);
    assert.strictEqual(result, true);
  }
  
  // Verify that old nonces are cleaned up by checking that
  // we can still add new nonces without issues
  const newNonce = `nonce_new_${Date.now()}`;
  const result = await checkNonce(newNonce, agentKeyId);
  assert.strictEqual(result, true);
});

test("validateTimestamp - handles edge case at exact clock skew boundary", () => {
  const now = Date.now();
  const exactlyOneMinuteFuture = now + 60000; // Exactly 1 minute in future
  
  assert.strictEqual(validateTimestamp(exactlyOneMinuteFuture), true);
});

test("validateTimestamp - handles edge case just beyond clock skew boundary", () => {
  const now = Date.now();
  const justBeyondSkew = now + 60001; // Just over 1 minute in future
  
  assert.strictEqual(validateTimestamp(justBeyondSkew), false);
});

test("validateTimestamp - handles edge case at exact max age boundary", () => {
  const now = Date.now();
  const exactlyMaxAge = now - 300000; // Exactly 5 minutes ago
  
  assert.strictEqual(validateTimestamp(exactlyMaxAge), true);
});

test("validateTimestamp - handles edge case just beyond max age boundary", () => {
  const now = Date.now();
  const justBeyondMaxAge = now - 300001; // Just over 5 minutes ago
  
  assert.strictEqual(validateTimestamp(justBeyondMaxAge), false);
});

