import { AgentKey } from "@metar/shared-types";

// Simple in-memory store (or use JSON file/database)
const agentKeys = new Map<string, AgentKey>();

/**
 * Looks up an agent key by its key ID.
 *
 * @param keyId - The agent key identifier
 * @returns The agent key if found, or null if not found
 */
export async function lookupAgentKey(keyId: string): Promise<AgentKey | null> {
  // Async for interface compatibility (future: database lookups)
  return Promise.resolve(agentKeys.get(keyId) || null);
}

/**
 * Adds an agent key to the registry.
 *
 * @param key - The agent key to add
 */
export function addAgentKey(key: AgentKey): void {
  agentKeys.set(key.keyId, key);
}

/**
 * Removes an agent key from the registry.
 *
 * @param keyId - The agent key identifier to remove
 * @returns true if the key was removed, false if it didn't exist
 */
export function removeAgentKey(keyId: string): boolean {
  return agentKeys.delete(keyId);
}

/**
 * Lists all registered agent keys.
 *
 * @returns Array of all registered agent keys
 */
export function listAgentKeys(): AgentKey[] {
  return Array.from(agentKeys.values());
}

/**
 * Clears all agent keys from the registry.
 * Useful for testing.
 */
export function clearAgentKeys(): void {
  agentKeys.clear();
}

// Add test agent key
addAgentKey({
  keyId: "test_agent_1",
  publicKey: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz", // Example, use real key
  algorithm: "ed25519",
});
