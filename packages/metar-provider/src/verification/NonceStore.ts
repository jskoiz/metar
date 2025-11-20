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
