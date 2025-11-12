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
import { PaymentHeaders, PaymentRequiredResponse } from "@meter/shared-types";
import { parsePaymentHeaders } from "../verification/parseHeaders.js";
import { validateTimestamp, checkNonce } from "../verification/validate.js";
import { verifyAgentSignature, AgentKeyRegistry } from "../verification/tap.js";
import { verifyPayment } from "../verification/payment.js";

/**
 * Options for configuring the x402 middleware.
 */
export interface MiddlewareOptions {
  /** Route identifier (e.g., "summarize:v1") */
  routeId: string;
  /** Payment price in token units (e.g., 0.03 for 0.03 USDC) */
  price: number;
  /** Token mint address (e.g., USDC mint) */
  tokenMint: string;
  /** Provider wallet address to receive payment */
  payTo: string;
  /** Optional agent registry URL (for future use) */
  agentRegistryURL?: string;
  /** Blockchain network identifier */
  chain: "solana" | "solana-devnet";
  /** Solana connection instance */
  connection: Connection;
  /** Agent key registry for looking up agent public keys */
  agentRegistry: AgentKeyRegistry;
  /** Optional function to check if a transaction has already been used */
  isTransactionUsed?: (txSig: string) => Promise<boolean>;
  /** Optional function to log payment usage */
  logUsage?: (headers: PaymentHeaders) => Promise<void>;
}

/**
 * Sends a 402 Payment Required response.
 * 
 * Formats and sends a standard 402 response with payment instructions
 * when payment verification fails or is missing.
 * 
 * @param res - Express response object
 * @param options - Middleware options containing payment details
 * @param message - Optional error message
 */
function send402Response(
  res: express.Response,
  options: MiddlewareOptions,
  message?: string
): void {
  const response: PaymentRequiredResponse = {
    error: "Payment Required",
    route: options.routeId,
    amount: options.price,
    currency: "USDC",
    payTo: options.payTo,
    mint: options.tokenMint,
    chain: options.chain,
    message: message || "Payment required to access this resource",
    tips: [
      "Make a USDC transfer to the payTo address",
      "Include the transaction signature in x-meter-tx header",
      "Include route, amount, and nonce in headers",
    ],
  };

  res.status(402).json(response);
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
 * import { createX402Middleware } from "@meter/meter-provider";
 * import { getUSDCMint } from "@meter/shared-config";
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

      // 2. Verify timestamp
      if (!validateTimestamp(paymentHeaders.timestamp)) {
        return send402Response(res, options, "Request expired");
      }

      // 3. Verify nonce
      if (!(await checkNonce(paymentHeaders.nonce, paymentHeaders.agentKeyId))) {
        return send402Response(res, options, "Invalid or reused nonce");
      }

      // 4. Verify agent signature
      if (
        !(await verifyAgentSignature(
          req,
          paymentHeaders.agentKeyId,
          options.agentRegistry
        ))
      ) {
        return send402Response(res, options, "Invalid agent signature");
      }

      // 5. Verify payment
      const expectedMint = new PublicKey(options.tokenMint);
      const expectedPayTo = new PublicKey(options.payTo);
      if (
        !(await verifyPayment(
          options.connection,
          paymentHeaders.txSig,
          expectedMint,
          expectedPayTo,
          options.price,
          paymentHeaders
        ))
      ) {
        return send402Response(res, options, "Payment verification failed");
      }

      // 6. Check idempotency
      if (
        options.isTransactionUsed &&
        (await options.isTransactionUsed(paymentHeaders.txSig))
      ) {
        return send402Response(res, options, "Transaction already used");
      }

      // 7. Log usage
      if (options.logUsage) {
        await options.logUsage(paymentHeaders);
      }

      // 8. Attach payment info to request
      (req as any).payment = paymentHeaders;

      next();
    } catch (error) {
      console.error("x402 middleware error:", error);
      return send402Response(res, options, "Internal error");
    }
  };
}

