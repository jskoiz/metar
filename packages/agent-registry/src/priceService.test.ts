/**
 * Unit tests for priceService functions.
 *
 * Tests price lookup, registration, and removal functionality.
 *
 * @see {@link file://hackathon/technical-specifications.md#price-lookup-endpoint | Technical Specifications: Price Lookup Endpoint}
 */

import { test } from "node:test";
import assert from "node:assert";
import { getPrice, setPrice, removePrice, getAllRouteIds } from "./priceService.js";
import { PriceResponse } from "@meter/shared-types";
import { getUSDCMint } from "@meter/shared-config";

// Test data
const testPriceResponse: PriceResponse = {
  price: 0.05,
  currency: "USDC",
  mint: getUSDCMint("devnet").toString(),
  payTo: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  routeId: "test-route:v1",
  chain: "solana-devnet",
};

test("getPrice - returns price for existing route", () => {
  const price = getPrice("summarize:v1");
  assert.ok(price !== null);
  assert.strictEqual(price.routeId, "summarize:v1");
  assert.strictEqual(price.price, 0.03);
  assert.strictEqual(price.currency, "USDC");
  assert.strictEqual(price.chain, "solana-devnet");
});

test("getPrice - returns null for non-existent route", () => {
  const price = getPrice("non-existent-route:v1");
  assert.strictEqual(price, null);
});

test("setPrice - registers a new price", () => {
  setPrice("test-route:v1", testPriceResponse);
  const price = getPrice("test-route:v1");
  assert.ok(price !== null);
  assert.strictEqual(price.routeId, "test-route:v1");
  assert.strictEqual(price.price, 0.05);
  assert.strictEqual(price.payTo, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");

  // Cleanup
  removePrice("test-route:v1");
});

test("setPrice - updates existing price", () => {
  const originalPrice = getPrice("summarize:v1");
  assert.ok(originalPrice !== null);

  const updatedPrice: PriceResponse = {
    ...originalPrice,
    price: 0.1,
  };

  setPrice("summarize:v1", updatedPrice);
  const retrievedPrice = getPrice("summarize:v1");
  assert.ok(retrievedPrice !== null);
  assert.strictEqual(retrievedPrice.price, 0.1);

  // Restore original price
  setPrice("summarize:v1", originalPrice);
});

test("removePrice - removes existing route", () => {
  setPrice("temp-route:v1", testPriceResponse);
  assert.ok(getPrice("temp-route:v1") !== null);

  const removed = removePrice("temp-route:v1");
  assert.strictEqual(removed, true);
  assert.strictEqual(getPrice("temp-route:v1"), null);
});

test("removePrice - returns false for non-existent route", () => {
  const removed = removePrice("non-existent-route:v1");
  assert.strictEqual(removed, false);
});

test("getAllRouteIds - returns all registered route IDs", () => {
  const routeIds = getAllRouteIds();
  assert.ok(Array.isArray(routeIds));
  assert.ok(routeIds.includes("summarize:v1"));
});

test("getAllRouteIds - includes newly added routes", () => {
  const initialCount = getAllRouteIds().length;
  setPrice("new-route:v1", testPriceResponse);

  const routeIds = getAllRouteIds();
  assert.strictEqual(routeIds.length, initialCount + 1);
  assert.ok(routeIds.includes("new-route:v1"));

  // Cleanup
  removePrice("new-route:v1");
});

test("getPrice - returns price for resize-image:v1 route", () => {
  const price = getPrice("resize-image:v1");
  assert.ok(price !== null);
  assert.strictEqual(price.routeId, "resize-image:v1");
  assert.strictEqual(price.price, 0.05);
  assert.strictEqual(price.currency, "USDC");
  assert.strictEqual(price.chain, "solana-devnet");
});

test("getAllRouteIds - includes both summarize:v1 and resize-image:v1", () => {
  const routeIds = getAllRouteIds();
  assert.ok(routeIds.includes("summarize:v1"));
  assert.ok(routeIds.includes("resize-image:v1"));
});

test("getPrice - validates PriceResponse structure", () => {
  const price = getPrice("summarize:v1");
  assert.ok(price !== null);
  assert.strictEqual(typeof price.price, "number");
  assert.strictEqual(typeof price.currency, "string");
  assert.strictEqual(typeof price.mint, "string");
  assert.strictEqual(typeof price.payTo, "string");
  assert.strictEqual(typeof price.routeId, "string");
  assert.strictEqual(typeof price.chain, "string");
});
