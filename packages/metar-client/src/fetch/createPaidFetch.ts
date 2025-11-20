import { Connection, PublicKey } from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";
import { WalletAdapter } from "../wallet/types.js";
import { getPrice } from "../price/getPrice.js";
import { buildUSDCTransfer, sendPayment } from "../payment/index.js";
import {
  constructSignatureBaseString,
  signRequest,
  createAuthorizationHeader,
} from "../signature/index.js";
import {
  PaymentRequiredError,
  PaymentVerificationError,
  InsufficientBalanceError,
} from "../errors/index.js";
import { PaymentMemo } from "@metar/shared-types";

/**
 * Configuration for creating a paid fetch wrapper.
 */
export interface PaidFetchConfig {
  /** Wallet adapter for signing transactions */
  wallet: WalletAdapter;
  /** Solana connection instance */
  connection: Connection;
  /** Agent key ID for TAP signature */
  agentKeyId: string;
  /** Agent private key for signing requests (Ed25519) */
  agentPrivateKey: Uint8Array;
  /** Base URL of the provider (e.g., "https://api.example.com") */
  providerBaseURL: string;
}

/**
 * Extracts route ID from a URL.
 *
 * Examples:
 * - "/api/summarize" -> "summarize:v1"
 * - "/api/summarize?param=value" -> "summarize:v1"
 * - "https://api.example.com/api/translate" -> "translate:v1"
 *
 * @param url - The URL to extract route from
 * @returns The route ID, defaulting to "default:v1" if not found
 */
function extractRouteId(url: string): string {
  // Remove protocol and domain if present
  const path = url.replace(/^https?:\/\/[^/]+/, "");

  // Match /api/{route} pattern
  const match = path.match(/\/api\/([^/?]+)/);
  if (match && match[1]) {
    // Assume version 1 if not specified
    const route = match[1];
    return route.includes(":") ? route : `${route}:v1`;
  }

  // Default route if pattern doesn't match
  return "default:v1";
}

/**
 * Extracts the path from a URL for signature construction.
 *
 * @param url - The full URL
 * @returns The path component (e.g., "/api/summarize")
 */
function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    // If URL parsing fails, try to extract path manually
    const match = url.match(/https?:\/\/[^/]+(\/[^?#]*)/);
    return match ? match[1] : "/";
  }
}

/**
 * Creates a fetch wrapper that automatically handles payment flow for paid API requests.
 *
 * This function returns a fetch-compatible function that:
 * 1. Intercepts fetch calls
 * 2. Extracts route ID from URL
 * 3. Gets price information from provider
 * 4. Builds and sends USDC payment transaction
 * 5. Constructs TAP signature for authentication
 * 6. Adds payment headers to the request
 * 7. Retries on 402 responses (up to 3 times)
 *
 * @param config - Configuration for the paid fetch wrapper
 * @returns A fetch-compatible function that handles payment flow automatically
 *
 * @example
 * ```typescript
 * import { Connection } from "@solana/web3.js";
 * import { createPaidFetch, createNodeWallet } from "@metar/metar-client";
 * import { Keypair } from "@solana/web3.js";
 *
 * const connection = new Connection("https://api.devnet.solana.com");
 * const keypair = Keypair.generate();
 * const wallet = createNodeWallet(keypair);
 *
 * const paidFetch = createPaidFetch({
 *   wallet,
 *   connection,
 *   agentKeyId: "agent-123",
 *   agentPrivateKey: keypair.secretKey,
 *   providerBaseURL: "https://api.example.com",
 * });
 *
 * // Use like regular fetch
 * const response = await paidFetch("https://api.example.com/api/summarize", {
 *   method: "POST",
 *   body: JSON.stringify({ text: "..." }),
 * });
 * ```
 *
 * @see {@link file://research/x402-client-sdk-patterns.md | Client SDK Patterns}
 */
export function createPaidFetch(config: PaidFetchConfig): typeof fetch {
  const { wallet, connection, agentKeyId, agentPrivateKey, providerBaseURL } = config;

  return async function paidFetch(
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> {
    // Convert input to URL string
    let url: string;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      url = String(input);
    }

    // Extract route ID and path
    const routeId = extractRouteId(url);
    const path = extractPath(url);
    const method = (init?.method || "GET").toUpperCase();

    // Maximum retries for 402 responses
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 1. Get price information
        const priceInfo = await getPrice(providerBaseURL, routeId);

        // 2. Generate nonce (UUID v7)
        // Note: Using UUID v4 for now. UUID v7 requires uuid@10+.
        const nonce = uuidv4();

        // 3. Build payment transaction
        if (!wallet.publicKey) {
          throw new Error("Wallet not connected");
        }

        const payer = wallet.publicKey;
        const recipient = new PublicKey(priceInfo.payTo);
        const mint = new PublicKey(priceInfo.mint);

        // Extract provider ID from base URL
        const providerId = new URL(providerBaseURL).hostname;

        // Create payment memo
        const memo: PaymentMemo = {
          providerId,
          routeId,
          nonce,
          amount: priceInfo.price,
          timestamp: Date.now(),
        };

        // Build transaction
        let transaction;
        try {
          transaction = await buildUSDCTransfer(
            connection,
            payer,
            recipient,
            priceInfo.price,
            mint,
            memo
          );
        } catch (error) {
          // Check if error is related to insufficient balance
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (
            errorMessage.includes("insufficient") ||
            errorMessage.includes("balance") ||
            errorMessage.includes("funds")
          ) {
            throw new InsufficientBalanceError({ routeId, amount: priceInfo.price });
          }
          throw error;
        }

        // 4. Send payment and wait for confirmation
        let txSig: string;
        try {
          txSig = await sendPayment(connection, wallet, transaction);
        } catch (error) {
          // Check if error is related to insufficient balance or missing token account
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (
            errorMessage.includes("insufficient") ||
            errorMessage.includes("balance") ||
            errorMessage.includes("funds") ||
            errorMessage.includes("no record of a prior credit") ||
            errorMessage.includes("Attempt to debit")
          ) {
            throw new InsufficientBalanceError({ routeId, amount: priceInfo.price });
          }
          throw error;
        }

        // 5. Construct TAP signature
        const timestamp = Date.now();
        const date = new Date(timestamp).toUTCString();

        const baseString = constructSignatureBaseString(method, path, date, nonce, txSig);
        
        // Debug logging
        if (process.env.DEBUG_TAP === "true") {
          console.log("[CLIENT TAP DEBUG] Constructing signature:");
          console.log(`  Method: ${method}`);
          console.log(`  Path: ${path}`);
          console.log(`  Date: ${date}`);
          console.log(`  Nonce: ${nonce}`);
          console.log(`  TxSig: ${txSig}`);
          console.log("[CLIENT TAP DEBUG] Base string:");
          console.log(baseString.split("\n").map((line, i) => `  ${i + 1}. ${line}`).join("\n"));
        }

        const signature = signRequest(agentPrivateKey, baseString);
        const authorizationHeader = createAuthorizationHeader(agentKeyId, signature);
        
        if (process.env.DEBUG_TAP === "true") {
          console.log("[CLIENT TAP DEBUG] Authorization header:", authorizationHeader);
        }

        // 6. Add all payment headers
        const headers = new Headers(init?.headers);
        headers.set("x-meter-tx", txSig);
        headers.set("x-meter-route", routeId);
        headers.set("x-meter-amt", priceInfo.price.toString());
        headers.set("x-meter-currency", priceInfo.currency);
        headers.set("x-meter-nonce", nonce);
        headers.set("x-meter-ts", timestamp.toString());
        headers.set("x-meter-agent-kid", agentKeyId);
        headers.set("authorization", authorizationHeader);
        headers.set("date", date);

        // 7. Make the original request with payment headers
        const response = await fetch(url, {
          ...init,
          headers,
        });

        // 8. Handle 402 responses (retry up to 3 times)
        if (response.status === 402) {
          const paymentDetails = await response.json().catch(() => ({}));

          // If this is not the last attempt, retry
          if (attempt < maxRetries - 1) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            continue;
          }

          // Last attempt failed with 402
          throw new PaymentRequiredError(paymentDetails);
        }

        // Check for other payment-related errors
        if (response.status === 403) {
          const errorDetails = await response.json().catch(() => ({}));
          throw new PaymentVerificationError(errorDetails);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (
          error instanceof InsufficientBalanceError ||
          error instanceof PaymentVerificationError ||
          (error instanceof PaymentRequiredError && attempt >= maxRetries - 1)
        ) {
          throw error;
        }

        // If this is not the last attempt, retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error("Request failed after retries");
  };
}
