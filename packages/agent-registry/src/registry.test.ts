/**
 * Unit tests for agent key registry functionality.
 *
 * Tests agent key lookup, addition, removal, and listing operations.
 */

import { test } from "node:test";
import assert from "node:assert";
import { AgentKey } from "@metar/shared-types";
import {
  lookupAgentKey,
  addAgentKey,
  removeAgentKey,
  listAgentKeys,
  clearAgentKeys,
} from "./registry.js";

test("lookupAgentKey - returns null for non-existent key", async () => {
  const result = await lookupAgentKey("non_existent_key");
  assert.strictEqual(result, null);
});

test("lookupAgentKey - returns agent key for existing key", async () => {
  const testKey: AgentKey = {
    keyId: "test_key_1",
    publicKey: "test_public_key_1",
    algorithm: "ed25519",
  };

  addAgentKey(testKey);
  const result = await lookupAgentKey("test_key_1");

  assert.notStrictEqual(result, null);
  assert.strictEqual(result?.keyId, "test_key_1");
  assert.strictEqual(result?.publicKey, "test_public_key_1");
  assert.strictEqual(result?.algorithm, "ed25519");

  // Cleanup
  removeAgentKey("test_key_1");
});

test("addAgentKey - adds agent key to registry", async () => {
  const testKey: AgentKey = {
    keyId: "test_key_2",
    publicKey: "test_public_key_2",
    algorithm: "ed25519",
  };

  addAgentKey(testKey);
  const result = await lookupAgentKey("test_key_2");

  assert.notStrictEqual(result, null);
  assert.strictEqual(result?.keyId, "test_key_2");

  // Cleanup
  removeAgentKey("test_key_2");
});

test("addAgentKey - overwrites existing key with same keyId", async () => {
  const testKey1: AgentKey = {
    keyId: "test_key_3",
    publicKey: "test_public_key_3",
    algorithm: "ed25519",
  };

  const testKey2: AgentKey = {
    keyId: "test_key_3",
    publicKey: "updated_public_key_3",
    algorithm: "ed25519",
  };

  addAgentKey(testKey1);
  addAgentKey(testKey2);
  const result = await lookupAgentKey("test_key_3");

  assert.notStrictEqual(result, null);
  assert.strictEqual(result?.publicKey, "updated_public_key_3");

  // Cleanup
  removeAgentKey("test_key_3");
});

test("removeAgentKey - returns true when key exists", async () => {
  const testKey: AgentKey = {
    keyId: "test_key_4",
    publicKey: "test_public_key_4",
    algorithm: "ed25519",
  };

  addAgentKey(testKey);
  const removed = removeAgentKey("test_key_4");

  assert.strictEqual(removed, true);
  const result = await lookupAgentKey("test_key_4");
  assert.strictEqual(result, null);
});

test("removeAgentKey - returns false when key does not exist", () => {
  const removed = removeAgentKey("non_existent_key");
  assert.strictEqual(removed, false);
});

test("listAgentKeys - returns all registered keys", () => {
  clearAgentKeys();

  const testKey1: AgentKey = {
    keyId: "test_key_5",
    publicKey: "test_public_key_5",
    algorithm: "ed25519",
  };

  const testKey2: AgentKey = {
    keyId: "test_key_6",
    publicKey: "test_public_key_6",
    algorithm: "ed25519",
  };

  addAgentKey(testKey1);
  addAgentKey(testKey2);

  const keys = listAgentKeys();
  assert.strictEqual(keys.length >= 2, true);

  const keyIds = keys.map(k => k.keyId);
  assert.strictEqual(keyIds.includes("test_key_5"), true);
  assert.strictEqual(keyIds.includes("test_key_6"), true);

  // Cleanup
  removeAgentKey("test_key_5");
  removeAgentKey("test_key_6");
});

test("listAgentKeys - includes test agent key", () => {
  // Re-add test agent key in case it was cleared by previous tests
  addAgentKey({
    keyId: "test_agent_1",
    publicKey: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
    algorithm: "ed25519",
  });

  const keys = listAgentKeys();
  const testAgentKey = keys.find(k => k.keyId === "test_agent_1");
  assert.notStrictEqual(testAgentKey, undefined);
  assert.strictEqual(testAgentKey?.keyId, "test_agent_1");
});

test("clearAgentKeys - removes all keys", () => {
  const testKey: AgentKey = {
    keyId: "test_key_7",
    publicKey: "test_public_key_7",
    algorithm: "ed25519",
  };

  addAgentKey(testKey);
  clearAgentKeys();

  const keys = listAgentKeys();
  // Should only have the test_agent_1 that gets added on module load
  const testKey7 = keys.find(k => k.keyId === "test_key_7");
  assert.strictEqual(testKey7, undefined);
});

test("lookupAgentKey - handles agent key with metadata", async () => {
  const testKey: AgentKey = {
    keyId: "test_key_8",
    publicKey: "test_public_key_8",
    algorithm: "ed25519",
    expiresAt: 1735689600000,
    metadata: {
      agentName: "Test Agent",
      issuer: "test-issuer",
      capabilities: ["payment", "verification"],
    },
  };

  addAgentKey(testKey);
  const result = await lookupAgentKey("test_key_8");

  assert.notStrictEqual(result, null);
  assert.strictEqual(result?.expiresAt, 1735689600000);
  assert.strictEqual(result?.metadata?.agentName, "Test Agent");
  assert.strictEqual(result?.metadata?.issuer, "test-issuer");
  assert.deepStrictEqual(result?.metadata?.capabilities, ["payment", "verification"]);

  // Cleanup
  removeAgentKey("test_key_8");
});
