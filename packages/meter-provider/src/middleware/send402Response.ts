/**
 * Sends a 402 Payment Required response.
 * 
 * Formats and sends a standard 402 response with payment instructions
 * when payment verification fails or is missing.
 * 
 * @param res - Express response object
 * @param options - Middleware options containing payment details
 * @param message - Optional error message
 * 
 * @see {@link file://hackathon/technical-specifications.md | Technical Specifications}
 */

import { Response } from "express";
import { PaymentRequiredResponse } from "@meter/shared-types";
import { MiddlewareOptions, RoutePricingConfig } from "./createX402Middleware.js";

export function send402Response(
  res: Response,
  options: MiddlewareOptions,
  routeId?: string,
  message?: string,
  routeConfig?: RoutePricingConfig
): void {
  // Determine route config and pricing info
  let finalRouteId: string | undefined;
  let finalPrice: number | undefined;
  let finalTokenMint: string | undefined;
  let finalPayTo: string | undefined;
  let finalChain: string | undefined;

  if (routeConfig) {
    // Use provided route config
    finalRouteId = routeId;
    finalPrice = routeConfig.price;
    finalTokenMint = routeConfig.tokenMint;
    finalPayTo = routeConfig.payTo;
    finalChain = routeConfig.chain;
  } else if (options.routeId && options.price !== undefined && options.tokenMint && options.payTo && options.chain) {
    // Fallback to single route mode options
    finalRouteId = options.routeId;
    finalPrice = options.price;
    finalTokenMint = options.tokenMint;
    finalPayTo = options.payTo;
    finalChain = options.chain;
  } else {
    // Use routeId from parameter if available
    finalRouteId = routeId || options.routeId;
    finalPrice = options.price;
    finalTokenMint = options.tokenMint;
    finalPayTo = options.payTo;
    finalChain = options.chain;
  }

  const response: PaymentRequiredResponse = {
    error: "Payment Required",
    route: finalRouteId || "unknown",
    amount: finalPrice ?? 0,
    currency: "USDC",
    payTo: finalPayTo || "",
    mint: finalTokenMint || "",
    chain: finalChain || "solana-devnet",
    message: message || "Payment required to access this resource",
    tips: [
      "Send USDC transfer to payTo address",
      "Include transaction signature in x-meter-tx header",
      "Include route, amount, and nonce in headers",
      "Retry request with payment proof",
    ],
  };

  res.status(402).json(response);
}

