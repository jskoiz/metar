/**
 * Shared TypeScript types and interfaces for the x402 protocol implementation.
 * 
 * These types define the structure of HTTP headers, payment payloads, transaction formats,
 * and API contracts used throughout the Meter SDK project.
 * 
 * @see {@link https://github.com/visa/trusted-agent-protocol | Trusted Agent Protocol}
 * @see {@link file://hackathon/technical-specifications.md | Technical Specifications}
 */

/**
 * Price lookup response structure.
 * 
 * Returned by the price endpoint (GET /.meter/price) to provide payment pricing
 * information for a specific route.
 * 
 * @see {@link file://hackathon/technical-specifications.md#price-lookup-response | Technical Specifications: Price Lookup Response}
 */
export interface PriceResponse {
  /** Payment amount in the specified currency */
  price: number;
  /** Currency code (e.g., "USDC") */
  currency: string;
  /** Token mint address (e.g., USDC mint on Solana) */
  mint: string;
  /** Provider wallet address to receive payment */
  payTo: string;
  /** Route identifier (e.g., "summarize:v1") */
  routeId: string;
  /** Optional signed price data for verification */
  priceSig?: string;
  /** Blockchain network identifier (e.g., "solana" or "solana-devnet") */
  chain: string;
  /** Optional price expiration timestamp in milliseconds */
  expiresAt?: number;
}

/**
 * Payment headers sent by client after payment.
 * 
 * These headers are included in requests to protected endpoints after a payment
 * transaction has been completed. They provide proof of payment and agent
 * authentication via TAP signature.
 * 
 * @see {@link file://hackathon/technical-specifications.md#client-request-headers | Technical Specifications: Client Request Headers}
 */
export interface PaymentHeaders {
  /** Solana transaction signature (x-meter-tx header) */
  txSig: string;
  /** Route identifier (x-meter-route header) */
  routeId: string;
  /** Payment amount (x-meter-amt header) */
  amount: number;
  /** Currency code (x-meter-currency header) */
  currency: string;
  /** Unique nonce, typically UUID v7 (x-meter-nonce header) */
  nonce: string;
  /** Unix timestamp in milliseconds (x-meter-ts header) */
  timestamp: number;
  /** Agent key ID for TAP signature (x-meter-agent-kid header) */
  agentKeyId: string;
}

/**
 * HTTP 402 Payment Required response structure.
 * 
 * Standard response format for endpoints that require payment before access.
 * Includes payment details and optional guidance messages.
 * 
 * @see {@link file://hackathon/technical-specifications.md#402-payment-required | Technical Specifications: 402 Payment Required}
 */
export interface PaymentRequiredResponse {
  /** Error type identifier */
  error: "Payment Required";
  /** Route identifier requiring payment */
  route: string;
  /** Payment amount required */
  amount: number;
  /** Currency code (e.g., "USDC") */
  currency: string;
  /** Provider wallet address to receive payment */
  payTo: string;
  /** Token mint address */
  mint: string;
  /** Blockchain network identifier */
  chain: string;
  /** Optional human-readable message */
  message?: string;
  /** Optional array of helpful tips for completing payment */
  tips?: string[];
}

/**
 * Usage record tracking payment transactions.
 * 
 * Records payment transactions and their consumption status for accounting
 * and audit purposes. Used by providers to track authorized payments and
 * prevent double-spending.
 * 
 * @see {@link file://hackathon/technical-specifications.md#usagerecord | Technical Specifications: UsageRecord}
 */
export interface UsageRecord {
  /** Unique record identifier (UUID) */
  id: string;
  /** Route identifier */
  routeId: string;
  /** Transaction signature */
  txSig: string;
  /** Payer wallet address */
  payer: string;
  /** Payment amount */
  amount: number;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Request nonce */
  nonce: string;
  /** Payment status: authorized (pending), consumed (used), or refunded */
  status: "authorized" | "consumed" | "refunded";
  /** Optional request hash for verification */
  reqHash?: string;
  /** Optional agent key ID */
  agentKeyId?: string;
}

/**
 * Agent key for Trusted Agent Protocol (TAP) authentication.
 * 
 * Represents an agent's public key used for signing requests according to
 * the Trusted Agent Protocol specification. Agents use these keys to
 * authenticate payment requests.
 * 
 * @see {@link file://hackathon/technical-specifications.md#agentkey | Technical Specifications: AgentKey}
 * @see {@link https://github.com/visa/trusted-agent-protocol | Trusted Agent Protocol}
 */
export interface AgentKey {
  /** Agent key identifier */
  keyId: string;
  /** Public key in base58 or base64 format */
  publicKey: string;
  /** Signature algorithm (currently only ed25519 supported) */
  algorithm: "ed25519";
  /** Optional expiration timestamp in milliseconds */
  expiresAt?: number;
  /** Optional metadata about the agent */
  metadata?: {
    /** Optional agent name */
    agentName?: string;
    /** Optional issuer identifier */
    issuer?: string;
    /** Optional array of agent capabilities */
    capabilities?: string[];
  };
}

/**
 * Nonce record for replay protection.
 * 
 * Tracks nonces used in payment requests to prevent replay attacks.
 * Each nonce must be unique per agent key and can only be consumed once.
 * 
 * @see {@link file://hackathon/technical-specifications.md#noncerecord | Technical Specifications: NonceRecord}
 */
export interface NonceRecord {
  /** Nonce value (typically UUID v7 or random 32-byte hex) */
  nonce: string;
  /** Agent key ID associated with this nonce */
  agentKeyId: string;
  /** First seen timestamp in milliseconds */
  timestamp: number;
  /** Whether this nonce has been consumed */
  consumed: boolean;
}

/**
 * Payment memo structure for Solana transactions.
 * 
 * Payment metadata included in Solana transaction memos to link payments
 * to specific routes and requests. Can be JSON string or base64-encoded.
 * 
 * @see {@link file://hackathon/technical-specifications.md#memo-structure | Technical Specifications: Memo Structure}
 */
export interface PaymentMemo {
  /** Provider identifier */
  providerId: string;
  /** Route identifier */
  routeId: string;
  /** Request nonce */
  nonce: string;
  /** Payment amount */
  amount: number;
  /** Optional payment timestamp in milliseconds */
  timestamp?: number;
}
