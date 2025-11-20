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
import { PaymentRequiredResponse } from "@metar/shared-types";
import { MiddlewareOptions, RoutePricingConfig } from "./createX402Middleware.js";

// Function overloads for backward compatibility
export function send402Response(res: Response, options: MiddlewareOptions, message?: string): void;
export function send402Response(
  res: Response,
  options: MiddlewareOptions,
  routeId: string,
  message: string,
  routeConfig?: RoutePricingConfig
): void;
export function send402Response(
  res: Response,
  options: MiddlewareOptions,
  routeIdOrMessage?: string,
  message?: string,
  routeConfig?: RoutePricingConfig
): void {
  // Determine if we're using old signature (message only) or new signature (routeId + message + routeConfig)
  // If routeConfig is provided or message is provided as second param, it's new signature
  // Otherwise, if routeIdOrMessage is provided and doesn't look like a routeId, it's old signature (message)

  let finalRouteId: string | undefined;
  let finalMessage: string | undefined;
  let finalRouteConfig: RoutePricingConfig | undefined;

  // New signature: routeConfig is provided, or message is provided as second parameter
  if (
    routeConfig !== undefined ||
    (message !== undefined && routeIdOrMessage && !routeIdOrMessage.includes(" "))
  ) {
    finalRouteId = routeIdOrMessage;
    finalMessage = message;
    finalRouteConfig = routeConfig;
  }
  // Old signature: only routeIdOrMessage provided, and it looks like a message (contains spaces or error words)
  else if (
    routeIdOrMessage &&
    (routeIdOrMessage.includes(" ") ||
      routeIdOrMessage.includes("expired") ||
      routeIdOrMessage.includes("failed") ||
      routeIdOrMessage.includes("required") ||
      routeIdOrMessage.includes("Invalid"))
  ) {
    finalRouteId = options.routeId;
    finalMessage = routeIdOrMessage;
    finalRouteConfig = undefined;
  }
  // New signature: routeId provided, no message
  else {
    finalRouteId = routeIdOrMessage;
    finalMessage = message;
    finalRouteConfig = routeConfig;
  }

  // Determine route config and pricing info
  let finalPrice: number | undefined;
  let finalTokenMint: string | undefined;
  let finalPayTo: string | undefined;
  let finalChain: string | undefined;

  if (finalRouteConfig) {
    // Use provided route config
    finalPrice = finalRouteConfig.price;
    finalTokenMint = finalRouteConfig.tokenMint;
    finalPayTo = finalRouteConfig.payTo;
    finalChain = finalRouteConfig.chain;
  } else if (
    options.routeId &&
    options.price !== undefined &&
    options.tokenMint &&
    options.payTo &&
    options.chain
  ) {
    // Fallback to single route mode options
    finalRouteId = finalRouteId || options.routeId;
    finalPrice = options.price;
    finalTokenMint = options.tokenMint;
    finalPayTo = options.payTo;
    finalChain = options.chain;
  } else {
    // Use routeId from parameter if available
    finalRouteId = finalRouteId || options.routeId;
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
    message: finalMessage || "Payment required to access this resource",
    tips: [
      "Send USDC transfer to payTo address",
      "Include transaction signature in x-meter-tx header",
      "Include route, amount, and nonce in headers",
      "Retry request with payment proof",
    ],
  };

  res.status(402).json(response);
}
