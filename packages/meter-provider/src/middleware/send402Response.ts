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
import { MiddlewareOptions } from "./createX402Middleware.js";

export function send402Response(
  res: Response,
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
      "Send USDC transfer to payTo address",
      "Include transaction signature in x-meter-tx header",
      "Include route, amount, and nonce in headers",
      "Retry request with payment proof",
    ],
  };

  res.status(402).json(response);
}

