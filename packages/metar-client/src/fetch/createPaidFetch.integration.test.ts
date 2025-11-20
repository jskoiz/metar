/**
 * Integration tests for createPaidFetch.
 *
 * Tests the complete payment flow orchestration including:
 * - Price lookup
 * - Payment transaction building and sending
 * - TAP signature construction
 * - Request headers
 * - 402 response handling and retries
 */

import { test } from "node:test";
import assert from "node:assert";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createPaidFetch } from "./createPaidFetch.js";
import { createNodeWallet } from "../wallet/nodeWallet.js";
import { PaymentRequiredError, PaymentVerificationError } from "../errors/index.js";
import { clearPriceCache } from "../price/getPrice.js";
import type { PriceResponse } from "@metar/shared-types";

// Mock fetch implementation
let mockFetch: typeof fetch;
let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

// Reset mock fetch before each test
function setupMockFetch() {
  fetchCalls = [];
  mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push({ url, init });

    // Handle price endpoint
    if (url.includes("/.meter/price")) {
      const routeMatch = url.match(/route=([^&]+)/);
      const routeId = routeMatch ? decodeURIComponent(routeMatch[1]) : "default:v1";

      const priceResponse: PriceResponse = {
        price: 0.03,
        currency: "USDC",
        mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        payTo: Keypair.generate().publicKey.toBase58(),
        routeId,
        chain: "solana-devnet",
      };

      return new Response(JSON.stringify(priceResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle API endpoint - check for payment headers
    if (url.includes("/api/")) {
      const headers = init?.headers as Headers | Record<string, string> | undefined;
      const getHeader = (name: string): string | null => {
        if (headers instanceof Headers) {
          return headers.get(name);
        }
        if (headers && typeof headers === "object") {
          return (headers as Record<string, string>)[name] || null;
        }
        return null;
      };

      const txSig = getHeader("x-meter-tx");
      const routeId = getHeader("x-meter-route");
      const nonce = getHeader("x-meter-nonce");
      const authHeader = getHeader("authorization");

      // If payment headers are missing, return 402
      if (!txSig || !routeId || !nonce || !authHeader) {
        return new Response(
          JSON.stringify({
            error: "Payment Required",
            route: routeId || "unknown",
            amount: 0.03,
            currency: "USDC",
          }),
          {
            status: 402,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Success response
      return new Response(JSON.stringify({ result: "success", routeId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };

  // Replace global fetch
  global.fetch = mockFetch as typeof fetch;
}

// Restore original fetch after tests
const originalFetch = global.fetch;

test.beforeEach(() => {
  setupMockFetch();
  clearPriceCache();
});

test.afterEach(() => {
  global.fetch = originalFetch;
});

test("createPaidFetch - successful payment flow", async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  const paidFetch = createPaidFetch({
    wallet,
    connection,
    agentKeyId: "test-agent-123",
    agentPrivateKey: keypair.secretKey,
    providerBaseURL: "https://api.example.com",
  });

  const response = await paidFetch("https://api.example.com/api/summarize", {
    method: "POST",
    body: JSON.stringify({ text: "test" }),
  });

  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.routeId, "summarize:v1");

  // Verify fetch was called for price lookup
  const priceCall = fetchCalls.find(call => call.url.includes("/.meter/price"));
  assert.ok(priceCall, "Price lookup should be called");

  // Verify fetch was called for API request with payment headers
  const apiCall = fetchCalls.find(call => call.url.includes("/api/summarize"));
  assert.ok(apiCall, "API request should be called");

  const headers = apiCall.init?.headers as Headers | Record<string, string> | undefined;
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    if (headers && typeof headers === "object") {
      return (headers as Record<string, string>)[name] || null;
    }
    return null;
  };

  assert.ok(getHeader("x-meter-tx"), "x-meter-tx header should be present");
  assert.ok(getHeader("x-meter-route"), "x-meter-route header should be present");
  assert.ok(getHeader("x-meter-nonce"), "x-meter-nonce header should be present");
  assert.ok(getHeader("x-meter-amt"), "x-meter-amt header should be present");
  assert.ok(getHeader("x-meter-currency"), "x-meter-currency header should be present");
  assert.ok(getHeader("x-meter-ts"), "x-meter-ts header should be present");
  assert.ok(getHeader("x-meter-agent-kid"), "x-meter-agent-kid header should be present");
  assert.ok(getHeader("authorization"), "authorization header should be present");
  assert.ok(getHeader("date"), "date header should be present");
});

test("createPaidFetch - extracts route ID correctly", async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  const paidFetch = createPaidFetch({
    wallet,
    connection,
    agentKeyId: "test-agent-123",
    agentPrivateKey: keypair.secretKey,
    providerBaseURL: "https://api.example.com",
  });

  // Mock successful response
  let requestCount = 0;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requestCount++;
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/.meter/price")) {
      const routeMatch = url.match(/route=([^&]+)/);
      const routeId = routeMatch ? decodeURIComponent(routeMatch[1]) : "default:v1";

      return new Response(
        JSON.stringify({
          price: 0.03,
          currency: "USDC",
          mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          payTo: Keypair.generate().publicKey.toBase58(),
          routeId,
          chain: "solana-devnet",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/api/")) {
      const headers = init?.headers as Headers | Record<string, string> | undefined;
      const getHeader = (name: string): string | null => {
        if (headers instanceof Headers) {
          return headers.get(name);
        }
        if (headers && typeof headers === "object") {
          return (headers as Record<string, string>)[name] || null;
        }
        return null;
      };

      const routeId = getHeader("x-meter-route");
      return new Response(JSON.stringify({ routeId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };

  const response = await paidFetch("https://api.example.com/api/translate", {
    method: "POST",
  });

  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.routeId, "translate:v1");
});

test("createPaidFetch - handles 402 response with retry", async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  const paidFetch = createPaidFetch({
    wallet,
    connection,
    agentKeyId: "test-agent-123",
    agentPrivateKey: keypair.secretKey,
    providerBaseURL: "https://api.example.com",
  });

  let apiCallCount = 0;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/.meter/price")) {
      return new Response(
        JSON.stringify({
          price: 0.03,
          currency: "USDC",
          mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          payTo: Keypair.generate().publicKey.toBase58(),
          routeId: "test:v1",
          chain: "solana-devnet",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/api/")) {
      apiCallCount++;
      // Return 402 on first call, 200 on subsequent calls
      if (apiCallCount === 1) {
        return new Response(
          JSON.stringify({
            error: "Payment Required",
            route: "test:v1",
            amount: 0.03,
            currency: "USDC",
          }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ result: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };

  const response = await paidFetch("https://api.example.com/api/test", {
    method: "GET",
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(apiCallCount, 2, "Should retry after 402");
});

test("createPaidFetch - throws PaymentRequiredError after max retries", async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  const paidFetch = createPaidFetch({
    wallet,
    connection,
    agentKeyId: "test-agent-123",
    agentPrivateKey: keypair.secretKey,
    providerBaseURL: "https://api.example.com",
  });

  global.fetch = async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/.meter/price")) {
      return new Response(
        JSON.stringify({
          price: 0.03,
          currency: "USDC",
          mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          payTo: Keypair.generate().publicKey.toBase58(),
          routeId: "test:v1",
          chain: "solana-devnet",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/api/")) {
      return new Response(
        JSON.stringify({
          error: "Payment Required",
          route: "test:v1",
          amount: 0.03,
          currency: "USDC",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Not Found", { status: 404 });
  };

  await assert.rejects(
    async () => {
      await paidFetch("https://api.example.com/api/test", { method: "GET" });
    },
    (error: unknown) => {
      return error instanceof PaymentRequiredError;
    },
    "Should throw PaymentRequiredError after max retries"
  );
});

test("createPaidFetch - handles 403 PaymentVerificationError", async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  const paidFetch = createPaidFetch({
    wallet,
    connection,
    agentKeyId: "test-agent-123",
    agentPrivateKey: keypair.secretKey,
    providerBaseURL: "https://api.example.com",
  });

  global.fetch = async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/.meter/price")) {
      return new Response(
        JSON.stringify({
          price: 0.03,
          currency: "USDC",
          mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          payTo: Keypair.generate().publicKey.toBase58(),
          routeId: "test:v1",
          chain: "solana-devnet",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/api/")) {
      return new Response(
        JSON.stringify({
          error: "Payment verification failed",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Not Found", { status: 404 });
  };

  await assert.rejects(
    async () => {
      await paidFetch("https://api.example.com/api/test", { method: "GET" });
    },
    (error: unknown) => {
      return error instanceof PaymentVerificationError;
    },
    "Should throw PaymentVerificationError on 403"
  );
});

test("createPaidFetch - preserves original request body and headers", async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  const paidFetch = createPaidFetch({
    wallet,
    connection,
    agentKeyId: "test-agent-123",
    agentPrivateKey: keypair.secretKey,
    providerBaseURL: "https://api.example.com",
  });

  let apiCallInit: RequestInit | undefined;

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/.meter/price")) {
      return new Response(
        JSON.stringify({
          price: 0.03,
          currency: "USDC",
          mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          payTo: Keypair.generate().publicKey.toBase58(),
          routeId: "test:v1",
          chain: "solana-devnet",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/api/")) {
      apiCallInit = init;
      return new Response(JSON.stringify({ result: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };

  const originalBody = JSON.stringify({ text: "test text", option: "value" });
  const originalHeaders = { "Content-Type": "application/json", "X-Custom-Header": "custom-value" };

  await paidFetch("https://api.example.com/api/test", {
    method: "POST",
    body: originalBody,
    headers: originalHeaders,
  });

  assert.ok(apiCallInit, "API call should be made");

  // Check that original body is preserved
  assert.strictEqual(apiCallInit.body, originalBody);

  // Check that original headers are preserved (along with payment headers)
  const headers = apiCallInit.headers as Headers | Record<string, string> | undefined;
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    if (headers && typeof headers === "object") {
      return (headers as Record<string, string>)[name] || null;
    }
    return null;
  };

  assert.strictEqual(getHeader("Content-Type"), "application/json");
  assert.strictEqual(getHeader("X-Custom-Header"), "custom-value");
});

test("createPaidFetch - generates unique nonce for each request", async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  const paidFetch = createPaidFetch({
    wallet,
    connection,
    agentKeyId: "test-agent-123",
    agentPrivateKey: keypair.secretKey,
    providerBaseURL: "https://api.example.com",
  });

  const nonces: string[] = [];

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/.meter/price")) {
      return new Response(
        JSON.stringify({
          price: 0.03,
          currency: "USDC",
          mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
          payTo: Keypair.generate().publicKey.toBase58(),
          routeId: "test:v1",
          chain: "solana-devnet",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/api/")) {
      const headers = init?.headers as Headers | Record<string, string> | undefined;
      const getHeader = (name: string): string | null => {
        if (headers instanceof Headers) {
          return headers.get(name);
        }
        if (headers && typeof headers === "object") {
          return (headers as Record<string, string>)[name] || null;
        }
        return null;
      };

      const nonce = getHeader("x-meter-nonce");
      if (nonce) {
        nonces.push(nonce);
      }

      return new Response(JSON.stringify({ result: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };

  // Make two requests
  await paidFetch("https://api.example.com/api/test1", { method: "GET" });
  await paidFetch("https://api.example.com/api/test2", { method: "GET" });

  assert.strictEqual(nonces.length, 2);
  assert.notStrictEqual(nonces[0], nonces[1], "Nonces should be unique");
});
