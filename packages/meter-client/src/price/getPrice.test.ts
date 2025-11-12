/**
 * Unit tests for getPrice function.
 * 
 * Tests successful price lookup, error handling, input validation,
 * and caching behavior.
 */

import { test } from "node:test";
import assert from "node:assert";
import { getPrice, clearPriceCache } from "./getPrice.js";
import type { PriceResponse } from "@meter/shared-types";

// Mock fetch globally
const originalFetch = globalThis.fetch;
let fetchCallCount = 0;
let mockFetchResponse: Response | null = null;

// Setup: Clear cache before each test
function setupTest() {
  clearPriceCache();
}

// Setup: Mock fetch before each test
function setupMockFetch(response: Response) {
  fetchCallCount = 0;
  mockFetchResponse = response;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCallCount++;
    return Promise.resolve(mockFetchResponse!);
  };
}

// Teardown: Restore original fetch after each test
function teardownMockFetch() {
  globalThis.fetch = originalFetch;
  fetchCallCount = 0;
  mockFetchResponse = null;
}

test("getPrice - successful price lookup", async () => {
  setupTest();
  const mockPriceResponse: PriceResponse = {
    price: 0.03,
    currency: "USDC",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
    routeId: "summarize:v1",
    chain: "solana",
  };

  setupMockFetch(
    new Response(JSON.stringify(mockPriceResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

  try {
    const result = await getPrice("https://api.example.com", "summarize:v1");

    assert.strictEqual(result.price, 0.03);
    assert.strictEqual(result.currency, "USDC");
    assert.strictEqual(result.routeId, "summarize:v1");
    assert.strictEqual(result.chain, "solana");
    assert.strictEqual(fetchCallCount, 1);
  } finally {
    teardownMockFetch();
    clearPriceCache();
  }
});

test("getPrice - 404 error handling", async () => {
  setupTest();
  setupMockFetch(
    new Response("Route not found", {
      status: 404,
    })
  );

  try {
    await assert.rejects(
      async () => {
        await getPrice("https://api.example.com", "nonexistent:route");
      },
      {
        message: "Route not found: nonexistent:route",
      }
    );
    assert.strictEqual(fetchCallCount, 1);
  } finally {
    teardownMockFetch();
    clearPriceCache();
  }
});

test("getPrice - invalid response format", async () => {
  setupTest();
  setupMockFetch(
    new Response(JSON.stringify({ price: 0.03 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

  try {
    await assert.rejects(
      async () => {
        await getPrice("https://api.example.com", "summarize:v1");
      },
      {
        message: "Invalid price response format",
      }
    );
    assert.strictEqual(fetchCallCount, 1);
  } finally {
    teardownMockFetch();
    clearPriceCache();
  }
});

test("getPrice - input validation (missing providerUrl)", async () => {
  setupTest();
  try {
    await assert.rejects(
      async () => {
        await getPrice("", "summarize:v1");
      },
      {
        message: "providerUrl and routeId are required",
      }
    );
    assert.strictEqual(fetchCallCount, 0);
  } finally {
    teardownMockFetch();
    clearPriceCache();
  }
});

test("getPrice - input validation (missing routeId)", async () => {
  setupTest();
  try {
    await assert.rejects(
      async () => {
        await getPrice("https://api.example.com", "");
      },
      {
        message: "providerUrl and routeId are required",
      }
    );
    assert.strictEqual(fetchCallCount, 0);
  } finally {
    teardownMockFetch();
    clearPriceCache();
  }
});

test("getPrice - other HTTP error", async () => {
  setupTest();
  setupMockFetch(
    new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error",
    })
  );

  try {
    await assert.rejects(
      async () => {
        await getPrice("https://api.example.com", "summarize:v1");
      },
      (error: unknown) => {
        return (
          error instanceof Error &&
          error.message.includes("Failed to get price")
        );
      }
    );
    assert.strictEqual(fetchCallCount, 1);
  } finally {
    teardownMockFetch();
    clearPriceCache();
  }
});

test("getPrice - caching with 1-minute TTL", async () => {
  setupTest();
  const mockPriceResponse: PriceResponse = {
    price: 0.03,
    currency: "USDC",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
    routeId: "summarize:v1",
    chain: "solana",
  };

  setupMockFetch(
    new Response(JSON.stringify(mockPriceResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

  try {
    const providerUrl = "https://api.example.com";
    const routeId = "summarize:v1";

    // First call - should fetch from API
    const result1 = await getPrice(providerUrl, routeId);
    assert.strictEqual(fetchCallCount, 1);

    // Second call - should use cache (no additional fetch)
    const result2 = await getPrice(providerUrl, routeId);
    assert.strictEqual(fetchCallCount, 1); // Still 1, not 2
    assert.deepStrictEqual(result1, result2);
  } finally {
    teardownMockFetch();
    clearPriceCache();
  }
});

test("getPrice - URL encoding for routeId", async () => {
  setupTest();
  const mockPriceResponse: PriceResponse = {
    price: 0.03,
    currency: "USDC",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
    routeId: "route:with:colons",
    chain: "solana",
  };

  let capturedUrl: string | null = null;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = typeof input === "string" ? input : input.toString();
    return Promise.resolve(
      new Response(JSON.stringify(mockPriceResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  };

  try {
    await getPrice("https://api.example.com", "route:with:colons");
    assert.ok(capturedUrl?.includes("route%3Awith%3Acolons"));
  } finally {
    teardownMockFetch();
    clearPriceCache();
  }
});

