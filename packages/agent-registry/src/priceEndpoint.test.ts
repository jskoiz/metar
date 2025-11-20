/**
 * Unit tests for priceEndpoint Express route handler.
 *
 * Tests the GET /.meter/price endpoint behavior.
 *
 * @see {@link file://hackathon/technical-specifications.md#price-lookup-endpoint | Technical Specifications: Price Lookup Endpoint}
 */

import { test } from "node:test";
import assert from "node:assert";
import { Request, Response } from "express";
import { priceEndpoint } from "./priceEndpoint.js";
import { setPrice, removePrice } from "./priceService.js";
import { PriceResponse } from "@metar/shared-types";
import { getUSDCMint } from "@metar/shared-config";

// Mock Express Request object
function createMockRequest(query: Record<string, string> = {}): Request {
  return {
    query,
  } as any as Request;
}

// Mock Express Response object
function createMockResponse(): Response & { statusCode: number; jsonData: any } {
  let statusCode = 200;
  let jsonData: any = null;

  return {
    status: function (code: number) {
      statusCode = code;
      return this as Response;
    },
    json: function (data: any) {
      jsonData = data;
      return this as Response;
    },
    get statusCode() {
      return statusCode;
    },
    get jsonData() {
      return jsonData;
    },
  } as any as Response & { statusCode: number; jsonData: any };
}

test("priceEndpoint - returns 400 when route parameter is missing", () => {
  const req = createMockRequest();
  const res = createMockResponse();

  priceEndpoint(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.jsonData !== null);
  assert.strictEqual(res.jsonData.error, "route parameter required");
});

test("priceEndpoint - returns 400 when route parameter is empty string", () => {
  const req = createMockRequest({ route: "" });
  const res = createMockResponse();

  priceEndpoint(req, res);

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.jsonData.error, "route parameter required");
});

test("priceEndpoint - returns 404 when route is not found", () => {
  const req = createMockRequest({ route: "non-existent-route:v1" });
  const res = createMockResponse();

  priceEndpoint(req, res);

  assert.strictEqual(res.statusCode, 404);
  assert.ok(res.jsonData !== null);
  assert.strictEqual(res.jsonData.error, "Route not found");
});

test("priceEndpoint - returns 200 with price data for existing route", () => {
  const req = createMockRequest({ route: "summarize:v1" });
  const res = createMockResponse();

  priceEndpoint(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.jsonData !== null);
  assert.strictEqual(res.jsonData.routeId, "summarize:v1");
  assert.strictEqual(res.jsonData.price, 0.03);
  assert.strictEqual(res.jsonData.currency, "USDC");
  assert.strictEqual(res.jsonData.chain, "solana-devnet");
});

test("priceEndpoint - returns correct PriceResponse structure", () => {
  const testRouteId = "test-endpoint-route:v1";
  const testPrice: PriceResponse = {
    price: 0.07,
    currency: "USDC",
    mint: getUSDCMint("devnet").toString(),
    payTo: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    routeId: testRouteId,
    chain: "solana-devnet",
  };

  setPrice(testRouteId, testPrice);

  const req = createMockRequest({ route: testRouteId });
  const res = createMockResponse();

  priceEndpoint(req, res);

  assert.strictEqual(res.statusCode, 200);
  const response = res.jsonData;
  assert.strictEqual(response.routeId, testRouteId);
  assert.strictEqual(response.price, 0.07);
  assert.strictEqual(response.currency, "USDC");
  assert.strictEqual(response.payTo, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
  assert.strictEqual(response.chain, "solana-devnet");
  assert.ok(typeof response.mint === "string");

  // Cleanup
  removePrice(testRouteId);
});

test("priceEndpoint - handles route parameter as array", () => {
  const req = createMockRequest({ route: ["summarize:v1"] as any });
  const res = createMockResponse();

  priceEndpoint(req, res);

  // Should treat array as string and work
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.jsonData !== null);
});
