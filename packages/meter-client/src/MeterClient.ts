import { Connection } from "@solana/web3.js";
import { WalletAdapter } from "./wallet/types.js";
import { createPaidFetch } from "./fetch/index.js";

/**
 * Configuration for MeterClient.
 */
export interface MeterClientConfig {
  /** Base URL of the provider (e.g., "https://api.example.com") */
  providerBaseURL: string;
  /** Agent key ID for TAP signature */
  agentKeyId: string;
  /** Agent private key for signing requests (Ed25519) */
  agentPrivateKey: Uint8Array;
  /** Wallet adapter for signing transactions */
  wallet: WalletAdapter;
  /** Solana connection instance */
  connection: Connection;
  /** Optional chain identifier (e.g., "solana" or "solana-devnet") */
  chain?: "solana" | "solana-devnet";
}

/**
 * MeterClient provides a high-level interface for making paid API requests.
 * 
 * This class wraps the paid fetch functionality and provides a convenient
 * request method that automatically handles payment flow and authentication.
 * 
 * @example
 * ```typescript
 * import { MeterClient } from "@meter/meter-client";
 * import { Connection } from "@solana/web3.js";
 * import { createNodeWallet } from "@meter/meter-client";
 * import { Keypair } from "@solana/web3.js";
 * 
 * const connection = new Connection("https://api.devnet.solana.com");
 * const keypair = Keypair.generate();
 * const wallet = createNodeWallet(keypair);
 * 
 * const client = new MeterClient({
 *   providerBaseURL: "https://api.example.com",
 *   agentKeyId: "agent-123",
 *   agentPrivateKey: keypair.secretKey,
 *   wallet,
 *   connection,
 *   chain: "solana-devnet",
 * });
 * 
 * // Make a paid API request
 * const response = await client.request("summarize", {
 *   method: "POST",
 *   body: JSON.stringify({ text: "..." }),
 * });
 * ```
 */
export class MeterClient {
  private paidFetch: typeof fetch;
  private config: MeterClientConfig;

  constructor(config: MeterClientConfig) {
    // Validate config
    if (!config.providerBaseURL || !config.agentKeyId || !config.agentPrivateKey || !config.wallet || !config.connection) {
      throw new Error("Invalid MeterClient configuration");
    }

    this.config = config;

    this.paidFetch = createPaidFetch({
      wallet: config.wallet,
      connection: config.connection,
      agentKeyId: config.agentKeyId,
      agentPrivateKey: config.agentPrivateKey,
      providerBaseURL: config.providerBaseURL,
    });
  }

  /**
   * Makes a paid API request to the specified route.
   * 
   * @param routeId - The route identifier (e.g., "summarize" or "summarize:v1")
   * @param options - Optional fetch options (method, headers, body, etc.)
   * @returns A promise that resolves to the Response object
   * 
   * @example
   * ```typescript
   * // Simple GET request
   * const response = await client.request("status");
   * 
   * // POST request with body
   * const response = await client.request("summarize", {
   *   method: "POST",
   *   headers: { "Content-Type": "application/json" },
   *   body: JSON.stringify({ text: "..." }),
   * });
   * ```
   */
  async request(routeId: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.providerBaseURL}/api/${routeId}`;
    return await this.paidFetch(url, options);
  }
}

