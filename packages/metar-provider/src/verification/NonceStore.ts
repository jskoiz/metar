/**
 * Interface for nonce storage.
 * Allows for different implementations (memory, Redis, database, etc.)
 */
export interface NonceStore {
  /**
   * Checks if a nonce has been used and marks it as consumed if not.
   * @param nonce - The nonce string
   * @param agentKeyId - The agent key identifier
   * @returns true if nonce was not previously used (and is now marked consumed), false if already used
   */
  checkAndConsume(nonce: string, agentKeyId: string): Promise<boolean>;
}

/**
 * In-memory implementation of NonceStore.
 * Suitable for single-instance deployments.
 */
export class InMemoryNonceStore implements NonceStore {
  private store = new Map<string, { timestamp: number }>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly ttlMs: number;

  constructor(ttlMs: number = 3600000) {
    // Default 1 hour TTL
    this.ttlMs = ttlMs;
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
    // Ensure interval doesn't block process exit
    this.cleanupInterval.unref();
  }

  async checkAndConsume(nonce: string, agentKeyId: string): Promise<boolean> {
    const key = `${agentKeyId}:${nonce}`;

    if (this.store.has(key)) {
      return false;
    }

    this.store.set(key, { timestamp: Date.now() });
    return true;
  }

  private cleanup() {
    const now = Date.now();
    const expiry = now - this.ttlMs;

    for (const [key, value] of this.store.entries()) {
      if (value.timestamp < expiry) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * File-based implementation of NonceStore.
 * Persists nonces to a JSON file.
 */
import fs from "fs";

export class FileNonceStore implements NonceStore {
  private store = new Map<string, { timestamp: number }>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly ttlMs: number;
  private readonly filePath: string;

  constructor(filePath: string, ttlMs: number = 3600000) {
    this.filePath = filePath;
    this.ttlMs = ttlMs;
    this.load();

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
    this.cleanupInterval.unref();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, "utf-8");
        const json = JSON.parse(data);
        this.store = new Map(Object.entries(json));
      }
    } catch (error) {
      console.error("Failed to load nonces from file:", error);
    }
  }

  private save() {
    try {
      const json = Object.fromEntries(this.store);
      fs.writeFileSync(this.filePath, JSON.stringify(json, null, 2));
    } catch (error) {
      console.error("Failed to save nonces to file:", error);
    }
  }

  async checkAndConsume(nonce: string, agentKeyId: string): Promise<boolean> {
    const key = `${agentKeyId}:${nonce}`;

    if (this.store.has(key)) {
      return false;
    }

    this.store.set(key, { timestamp: Date.now() });
    this.save();
    return true;
  }

  private cleanup() {
    const now = Date.now();
    const expiry = now - this.ttlMs;
    let changed = false;

    for (const [key, value] of this.store.entries()) {
      if (value.timestamp < expiry) {
        this.store.delete(key);
        changed = true;
      }
    }

    if (changed) {
      this.save();
    }
  }
}
