import { PriceResponse } from "@metar/shared-types";

/**
 * Cache entry for price responses
 */
interface CacheEntry {
  data: PriceResponse;
  expiresAt: number;
}

/**
 * In-memory cache for price responses
 * Key: `${providerUrl}:${routeId}`
 */
const priceCache = new Map<string, CacheEntry>();

/**
 * Clear the price cache (useful for testing)
 * @internal
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Cache TTL in milliseconds (1 minute)
 */
const CACHE_TTL_MS = 60 * 1000;

/**
 * Get price for a specific route from a provider.
 *
 * Fetches pricing information from the provider's price endpoint.
 * Includes caching with a 1-minute TTL to reduce API calls.
 *
 * @param providerUrl - The base URL of the provider (e.g., "https://api.example.com")
 * @param routeId - The route identifier (e.g., "summarize:v1")
 * @returns Promise resolving to the price response
 * @throws Error if providerUrl or routeId is missing
 * @throws Error if route is not found (404)
 * @throws Error if the request fails or response format is invalid
 *
 * @example
 * ```typescript
 * const price = await getPrice("https://api.example.com", "summarize:v1");
 * console.log(`Price: ${price.price} ${price.currency}`);
 * ```
 */
export async function getPrice(providerUrl: string, routeId: string): Promise<PriceResponse> {
  // Validate inputs
  if (!providerUrl || !routeId) {
    throw new Error("providerUrl and routeId are required");
  }

  // Check cache
  const cacheKey = `${providerUrl}:${routeId}`;
  const cached = priceCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Build URL
  const url = `${providerUrl}/.meter/price?route=${encodeURIComponent(routeId)}`;

  // Fetch price
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Route not found: ${routeId}`);
    }
    throw new Error(`Failed to get price: ${response.statusText}`);
  }

  const data = await response.json();

  // Validate response matches PriceResponse
  if (
    typeof data !== "object" ||
    data === null ||
    !("price" in data) ||
    !("currency" in data) ||
    !("mint" in data) ||
    !("payTo" in data) ||
    !("routeId" in data) ||
    !("chain" in data) ||
    typeof (data as Record<string, unknown>).price !== "number" ||
    typeof (data as Record<string, unknown>).currency !== "string" ||
    typeof (data as Record<string, unknown>).mint !== "string" ||
    typeof (data as Record<string, unknown>).payTo !== "string" ||
    typeof (data as Record<string, unknown>).routeId !== "string" ||
    typeof (data as Record<string, unknown>).chain !== "string"
  ) {
    throw new Error("Invalid price response format");
  }

  const priceResponse = data as PriceResponse;

  // Cache the response
  priceCache.set(cacheKey, {
    data: priceResponse,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return priceResponse;
}
