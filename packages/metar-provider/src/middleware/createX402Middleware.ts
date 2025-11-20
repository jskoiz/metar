/**
 * Express middleware for x402 payment verification.
 *
 * This middleware protects Express routes by verifying payment transactions
 * and agent signatures according to the x402 protocol specification.
 *
 * @see {@link file://research/x402-provider-middleware-patterns.md | Provider Middleware Patterns}
 */

import express from "express";
import { Connection, PublicKey } from "@solana/web3.js";
import { PaymentHeaders } from "@metar/shared-types";
import { parsePaymentHeaders } from "../verification/parseHeaders.js";
import { validateTimestamp, checkNonce } from "../verification/validate.js";
import { NonceStore } from "../verification/NonceStore.js";
import { verifyAgentSignature, AgentKeyRegistry } from "../verification/tap.js";
import { verifyPayment } from "../verification/payment.js";
import { send402Response } from "./send402Response.js";

/**
 * Facilitator verification response structure.
 */
interface FacilitatorVerifyResponse {
  status?: string;
  verified: boolean;
  payer?: string;
  timestamp?: number;
  error?: string;
}

/**
 * Verifies payment via facilitator service.
 *
 * Calls the facilitator's /verify endpoint to check if a payment transaction
 * is valid. This abstracts the complexity of on-chain verification.
 *
 * @param facilitatorUrl - Base URL of the facilitator service
 * @param txSig - Transaction signature to verify
 * @param routeId - Route identifier
 * @param amount - Payment amount
 * @returns Promise that resolves to true if payment is verified, false otherwise
 *
 * @see {@link file://research/x402-facilitator-pattern.md | Facilitator Pattern}
 */
export async function verifyPaymentViaFacilitator(
  facilitatorUrl: string,
  txSig: string,
  routeId: string,
  amount: number
): Promise<boolean> {
  try {
    const url = `${facilitatorUrl.replace(/\/$/, "")}/verify`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        txSig,
        routeId,
        amount,
      }),
      // Set a reasonable timeout (5 seconds)
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`Facilitator verification failed: ${response.status} ${response.statusText}`);
      return false;
    }

    const result = (await response.json()) as FacilitatorVerifyResponse;
    return result.verified === true;
  } catch (error) {
    console.error("Facilitator verification error:", error);
    return false;
  }
}

/**
 * Route-specific pricing configuration.
 */
export interface RoutePricingConfig {
  /** Payment price in token units (e.g., 0.03 for 0.03 USDC) */
  price: number;
  /** Token mint address (e.g., USDC mint) */
  tokenMint: string;
  /** Provider wallet address to receive payment */
  payTo: string;
  /** Blockchain network identifier */
  chain: "solana" | "solana-devnet";
}

/**
 * Options for configuring the x402 middleware.
 *
 * Supports two modes:
 * 1. Single route mode: Provide routeId, price, tokenMint, payTo, chain
 * 2. Multi-route mode: Provide routes map with route-specific pricing configs
 */
export interface MiddlewareOptions {
  /** Route identifier (e.g., "summarize:v1") - required for single route mode */
  routeId?: string;
  /** Payment price in token units (e.g., 0.03 for 0.03 USDC) - required for single route mode */
  price?: number;
  /** Token mint address (e.g., USDC mint) - required for single route mode */
  tokenMint?: string;
  /** Provider wallet address to receive payment - required for single route mode */
  payTo?: string;
  /** Blockchain network identifier - required for single route mode */
  chain?: "solana" | "solana-devnet";
  /** Route-specific pricing configurations - required for multi-route mode */
  routes?: Map<string, RoutePricingConfig> | Record<string, RoutePricingConfig>;
  /** Optional agent registry URL (for future use) */
  agentRegistryURL?: string;
  /** Solana connection instance */
  connection: Connection;
  /** Agent key registry for looking up agent public keys */
  agentRegistry: AgentKeyRegistry;
  /** Optional function to check if a transaction has already been used */
  isTransactionUsed?: (txSig: string) => Promise<boolean>;
  /** Optional function to log payment usage */
  logUsage?: (headers: PaymentHeaders) => Promise<void>;
  /** Enable facilitator mode for payment verification */
  facilitatorMode?: boolean;
  /** Facilitator service URL (required if facilitatorMode is true) */
  facilitatorUrl?: string;
  /** Optional NonceStore for custom nonce storage (e.g. Redis) */
  nonceStore?: NonceStore;
}

/**
 * Creates Express middleware for x402 payment verification.
 *
 * This middleware performs the following verification steps:
 * 1. Parse payment headers from the request
 * 2. Validate request timestamp (prevent expired requests)
 * 3. Verify nonce (prevent replay attacks)
 * 4. Verify agent signature using TAP
 * 5. Verify payment transaction on-chain
 * 6. Check idempotency (optional)
 * 7. Log usage (optional)
 *
 * On success, attaches payment information to the request object as `req.payment`.
 * On failure, sends a 402 Payment Required response.
 *
 * @param options - Middleware configuration options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from "express";
 * import { Connection, PublicKey } from "@solana/web3.js";
 * import { createX402Middleware } from "@metar/metar-provider";
 * import { getUSDCMint } from "@metar/shared-config";
 *
 * const app = express();
 * const connection = new Connection("https://api.devnet.solana.com");
 * const usdcMint = getUSDCMint("devnet");
 *
 * app.get(
 *   "/api/summarize",
 *   createX402Middleware({
 *     routeId: "summarize:v1",
 *     price: 0.03,
 *     tokenMint: usdcMint,
 *     payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
 *     chain: "solana-devnet",
 *     connection,
 *     agentRegistry: myAgentRegistry,
 *   }),
 *   async (req, res) => {
 *     // Access payment info: req.payment
 *     const summary = await summarizeText(req.query.text);
 *     res.json({ summary });
 *   }
 * );
 * ```
 */
/**
 * Gets route pricing config from options based on routeId.
 */
function getRouteConfig(options: MiddlewareOptions, routeId: string): RoutePricingConfig | null {
  // Multi-route mode: look up from routes map
  if (options.routes) {
    const routesMap =
      options.routes instanceof Map ? options.routes : new Map(Object.entries(options.routes));
    const config = routesMap.get(routeId);
    if (config) {
      return config;
    }
    return null;
  }

  // Single route mode: use direct options if routeId matches
  if (options.routeId && options.routeId === routeId) {
    if (options.price !== undefined && options.tokenMint && options.payTo && options.chain) {
      return {
        price: options.price,
        tokenMint: options.tokenMint,
        payTo: options.payTo,
        chain: options.chain,
      };
    }
  }

  return null;
}

export function createX402Middleware(options: MiddlewareOptions) {
  return async function x402Middleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      // 1. Parse headers
      const paymentHeaders = parsePaymentHeaders(req);
      if (!paymentHeaders) {
        return send402Response(res, options);
      }

      // Get route-specific pricing config
      const routeConfig = getRouteConfig(options, paymentHeaders.routeId);
      if (!routeConfig) {
        return send402Response(res, options, paymentHeaders.routeId, "Route not found");
      }

      // 2. Verify timestamp
      if (!validateTimestamp(paymentHeaders.timestamp)) {
        return send402Response(
          res,
          options,
          paymentHeaders.routeId,
          "Request expired",
          routeConfig
        );
      }

      // 3. Verify nonce
      if (
        !(await checkNonce(paymentHeaders.nonce, paymentHeaders.agentKeyId, options.nonceStore))
      ) {
        return send402Response(
          res,
          options,
          paymentHeaders.routeId,
          "Invalid or reused nonce",
          routeConfig
        );
      }

      // 4. Verify agent signature
      if (!(await verifyAgentSignature(req, paymentHeaders.agentKeyId, options.agentRegistry))) {
        return send402Response(
          res,
          options,
          paymentHeaders.routeId,
          "Invalid agent signature",
          routeConfig
        );
      }

      // 5. Verify payment
      let paymentResult: { success: boolean; error?: string } = { success: false };

      if (options.facilitatorMode && options.facilitatorUrl) {
        // Use facilitator for verification
        const verified = await verifyPaymentViaFacilitator(
          options.facilitatorUrl,
          paymentHeaders.txSig,
          paymentHeaders.routeId,
          paymentHeaders.amount
        );
        paymentResult = { success: verified };

        // Fallback to direct verification if facilitator fails
        if (!paymentResult.success) {
          console.warn("Facilitator verification failed, falling back to direct verification");
          const expectedMint = new PublicKey(routeConfig.tokenMint);
          const expectedPayTo = new PublicKey(routeConfig.payTo);
          const result = await verifyPayment(
            options.connection,
            paymentHeaders.txSig,
            expectedMint,
            expectedPayTo,
            routeConfig.price,
            paymentHeaders
          );
          paymentResult = {
            success: result.success,
            error: result.error?.message,
          };
        }
      } else {
        // Direct verification
        const expectedMint = new PublicKey(routeConfig.tokenMint);
        const expectedPayTo = new PublicKey(routeConfig.payTo);
        const result = await verifyPayment(
          options.connection,
          paymentHeaders.txSig,
          expectedMint,
          expectedPayTo,
          routeConfig.price,
          paymentHeaders
        );
        paymentResult = {
          success: result.success,
          error: result.error?.message,
        };
      }

      if (!paymentResult.success) {
        const errorMessage = paymentResult.error || "Payment verification failed";
        return send402Response(res, options, paymentHeaders.routeId, errorMessage, routeConfig);
      }

      // 6. Check idempotency
      if (options.isTransactionUsed && (await options.isTransactionUsed(paymentHeaders.txSig))) {
        return send402Response(
          res,
          options,
          paymentHeaders.routeId,
          "Transaction already used",
          routeConfig
        );
      }

      // 7. Log usage
      if (options.logUsage) {
        await options.logUsage(paymentHeaders);
      }

      // 8. Attach payment info to request
      req.payment = paymentHeaders;

      next();
    } catch (error) {
      console.error("x402 middleware error:", error);
      const routeId = parsePaymentHeaders(req)?.routeId;
      const routeConfig = routeId ? getRouteConfig(options, routeId) : null;
      if (routeId && routeConfig) {
        return send402Response(res, options, routeId, "Internal error", routeConfig);
      } else if (routeId) {
        return send402Response(res, options, routeId, "Internal error");
      } else {
        return send402Response(res, options, "Internal error");
      }
    }
  };
}
