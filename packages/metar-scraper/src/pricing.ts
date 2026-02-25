/**
 * Pricing table for all x/scrape routes.
 *
 * Prices are in USDC (e.g., 0.50 = $0.50).
 */

export const PRICING = {
  "x/scrape/followers/:username": {
    price: 0.50,
    description: "All followers for a user (JSON, paginated)",
  },
  "x/scrape/mentions": {
    price: 0.25,
    description: "Recent monitored mentions",
  },
  "x/scrape/comments/:tweetId": {
    price: 0.50,
    description: "All comments on a tweet",
  },
  "x/scrape/wallets/:username": {
    price: 1.00,
    description: "Wallet addresses extracted from follower bios",
  },
  "x/scrape/status": {
    price: 0.05,
    description: "Current scraper job status",
  },
  "x/scrape/pricing": {
    price: 0.05,
    description: "List all scraper routes and prices",
  },
} as const;

export type RouteId = keyof typeof PRICING;
