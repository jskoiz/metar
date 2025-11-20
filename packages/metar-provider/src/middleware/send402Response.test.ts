/**
 * Unit tests for send402Response function.
 *
 * Tests the 402 Payment Required response formatting and sending.
 *
 * @see {@link file://hackathon/technical-specifications.md | Technical Specifications}
 */

import { test } from "node:test";
import assert from "node:assert";
import { Response } from "express";
import { send402Response } from "./send402Response.js";
import { MiddlewareOptions } from "./createX402Middleware.js";
import { Connection } from "@solana/web3.js";
import { AgentKeyRegistry } from "../verification/tap.js";

// Mock Express Response object
function createMockResponse(): Response {
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
  } as any as Response;
}

// Mock MiddlewareOptions
function createMockOptions(): MiddlewareOptions {
  return {
    routeId: "summarize:v1",
    price: 0.03,
    tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
    chain: "solana-devnet",
    connection: {} as Connection,
    agentRegistry: {} as AgentKeyRegistry,
  };
}

test("send402Response - sets status code to 402", () => {
  const res = createMockResponse();
  const options = createMockOptions();

  send402Response(res, options);

  assert.strictEqual(res.statusCode, 402);
});

test("send402Response - sends correct response structure", () => {
  const res = createMockResponse();
  const options = createMockOptions();

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.ok(response !== null);
  assert.strictEqual(response.error, "Payment Required");
  assert.strictEqual(response.route, "summarize:v1");
  assert.strictEqual(response.amount, 0.03);
  assert.strictEqual(response.currency, "USDC");
  assert.strictEqual(response.payTo, "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz");
  assert.strictEqual(response.mint, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  assert.strictEqual(response.chain, "solana-devnet");
});

test("send402Response - uses default message when none provided", () => {
  const res = createMockResponse();
  const options = createMockOptions();

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.strictEqual(response.message, "Payment required to access this resource");
});

test("send402Response - uses custom message when provided", () => {
  const res = createMockResponse();
  const options = createMockOptions();
  const customMessage = "Request expired";

  send402Response(res, options, customMessage);

  const response = (res as any).jsonData;
  assert.strictEqual(response.message, customMessage);
});

test("send402Response - includes all tips", () => {
  const res = createMockResponse();
  const options = createMockOptions();

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.ok(Array.isArray(response.tips));
  assert.strictEqual(response.tips.length, 4);
  assert.strictEqual(response.tips[0], "Send USDC transfer to payTo address");
  assert.strictEqual(response.tips[1], "Include transaction signature in x-meter-tx header");
  assert.strictEqual(response.tips[2], "Include route, amount, and nonce in headers");
  assert.strictEqual(response.tips[3], "Retry request with payment proof");
});

test("send402Response - handles different route IDs", () => {
  const res = createMockResponse();
  const options = createMockOptions();
  options.routeId = "translate:v2";

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.strictEqual(response.route, "translate:v2");
});

test("send402Response - handles different prices", () => {
  const res = createMockResponse();
  const options = createMockOptions();
  options.price = 0.05;

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.strictEqual(response.amount, 0.05);
});

test("send402Response - handles solana mainnet chain", () => {
  const res = createMockResponse();
  const options = createMockOptions();
  options.chain = "solana";

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.strictEqual(response.chain, "solana");
});

test("send402Response - handles different payTo addresses", () => {
  const res = createMockResponse();
  const options = createMockOptions();
  options.payTo = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.strictEqual(response.payTo, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
});

test("send402Response - handles different token mints", () => {
  const res = createMockResponse();
  const options = createMockOptions();
  options.tokenMint = "So11111111111111111111111111111111111111112";

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.strictEqual(response.mint, "So11111111111111111111111111111111111111112");
});

test("send402Response - always sets currency to USDC", () => {
  const res = createMockResponse();
  const options = createMockOptions();

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.strictEqual(response.currency, "USDC");
});

test("send402Response - always sets error to Payment Required", () => {
  const res = createMockResponse();
  const options = createMockOptions();

  send402Response(res, options);

  const response = (res as any).jsonData;
  assert.strictEqual(response.error, "Payment Required");
});
