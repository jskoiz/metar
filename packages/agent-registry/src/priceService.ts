/**
 * Price Service
 * 
 * Provides price lookup functionality for x402 payment routes.
 * 
 * @see {@link file://hackathon/technical-specifications.md#price-lookup-endpoint | Technical Specifications: Price Lookup Endpoint}
 */

import { PriceResponse } from "@meter/shared-types";
import { getUSDCMint } from "@meter/shared-config";

const prices = new Map<string, PriceResponse>();

// Add test routes
prices.set("summarize:v1", {
  price: 0.03,
  currency: "USDC",
  mint: getUSDCMint("devnet").toString(),
  payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz", // Example
  routeId: "summarize:v1",
  chain: "solana-devnet",
});

/**
 * Retrieves the price for a given route identifier.
 * 
 * @param routeId - The route identifier (e.g., "summarize:v1")
 * @returns The price response if found, null otherwise
 */
export function getPrice(routeId: string): PriceResponse | null {
  return prices.get(routeId) || null;
}

/**
 * Registers a price for a route. Useful for adding or updating prices programmatically.
 * 
 * @param routeId - The route identifier
 * @param priceResponse - The price response to register
 */
export function setPrice(routeId: string, priceResponse: PriceResponse): void {
  prices.set(routeId, priceResponse);
}

/**
 * Removes a price registration for a route.
 * 
 * @param routeId - The route identifier to remove
 * @returns true if the route was removed, false if it didn't exist
 */
export function removePrice(routeId: string): boolean {
  return prices.delete(routeId);
}

/**
 * Gets all registered route IDs.
 * 
 * @returns An array of all registered route identifiers
 */
export function getAllRouteIds(): string[] {
  return Array.from(prices.keys());
}

