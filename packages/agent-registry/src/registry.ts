import { AgentKey } from "@metar/shared-types";

import fs from "fs";

// Simple in-memory store (or use JSON file/database)
const agentKeys = new Map<string, AgentKey>();

/**
 * File-based Agent Registry.
 * Persists agent keys to a JSON file.
 */
export class FileAgentRegistry {
  private store = new Map<string, AgentKey>();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, "utf-8");
        const json = JSON.parse(data);
        this.store = new Map(Object.entries(json));
      }
    } catch (error) {
      console.error("Failed to load agent keys from file:", error);
    }
  }

  private save() {
    try {
      const json = Object.fromEntries(this.store);
      fs.writeFileSync(this.filePath, JSON.stringify(json, null, 2));
    } catch (error) {
      console.error("Failed to save agent keys to file:", error);
    }
  }

  async lookupAgentKey(keyId: string): Promise<AgentKey | null> {
    return this.store.get(keyId) || null;
  }

  addAgentKey(key: AgentKey): void {
    this.store.set(key.keyId, key);
    this.save();
  }

  removeAgentKey(keyId: string): boolean {
    const deleted = this.store.delete(keyId);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  listAgentKeys(): AgentKey[] {
    return Array.from(this.store.values());
  }
}

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
 * @returns void
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


