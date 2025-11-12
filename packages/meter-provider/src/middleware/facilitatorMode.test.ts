/**
 * Unit tests for facilitator mode functionality in x402 middleware.
 * 
 * Tests the facilitator verification flow including:
 * 1. Facilitator mode enabled with successful verification
 * 2. Facilitator mode enabled with failed verification and fallback
 * 3. Facilitator mode disabled (direct verification)
 * 4. Error handling for facilitator service failures
 * 
 * @see {@link file://research/x402-facilitator-pattern.md | Facilitator Pattern}
 */

import { test, mock } from "node:test";
import assert from "node:assert";
import { Request, Response, NextFunction } from "express";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { AgentKey } from "@meter/shared-types";
import { createX402Middleware, MiddlewareOptions } from "./createX402Middleware.js";
import { AgentKeyRegistry } from "../verification/tap.js";
import { createConnection, getUSDCMint } from "@meter/shared-config";

// Mock AgentKeyRegistry for testing
class MockAgentKeyRegistry implements AgentKeyRegistry {
  private keys: Map<string, AgentKey> = new Map();

  addKey(key: AgentKey): void {
    this.keys.set(key.keyId, key);
  }

  async lookupAgentKey(keyId: string): Promise<AgentKey | null> {
    return this.keys.get(keyId) || null;
  }
}

// Helper to create a signed request
function createSignedRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  keypair: nacl.SignKeyPair,
  keyId: string
): Request {
  const baseString = [
    `(request-target): ${method.toLowerCase()} ${path}`,
    `date: ${headers.date || new Date().toUTCString()}`,
    `x-meter-nonce: ${headers["x-meter-nonce"]}`,
    `x-meter-tx: ${headers["x-meter-tx"]}`,
  ].join("\n");

  const message = new TextEncoder().encode(baseString);
  const signature = nacl.sign.detached(message, keypair.secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");

  return {
    method,
    path,
    query: {},
    headers: {
      ...headers,
      authorization: `Signature keyId="${keyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signatureBase64}"`,
    },
  } as Request;
}

// Mock fetch for facilitator calls
const originalFetch = global.fetch;

test("createX402Middleware - uses facilitator when facilitatorMode is enabled", async () => {
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");
  const registry = new MockAgentKeyRegistry();
  const keypair = nacl.sign.keyPair();
  const keyId = "test-agent";

  registry.addKey({
    keyId,
    publicKey: Buffer.from(keypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  const facilitatorUrl = "https://facilitator.example.com";
  let facilitatorCalled = false;
  let facilitatorRequestBody: any = null;

  // Mock fetch to intercept facilitator calls
  global.fetch = mock.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/verify")) {
      facilitatorCalled = true;
      facilitatorRequestBody = JSON.parse(options?.body as string);
      return new Response(
        JSON.stringify({
          status: "ok",
          verified: true,
          payer: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
          timestamp: Date.now(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(url, options);
  }) as any;

  const options: MiddlewareOptions = {
    routeId: "test:v1",
    price: 0.01,
    tokenMint: usdcMint.toString(),
    payTo: Keypair.generate().publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry: registry,
    facilitatorMode: true,
    facilitatorUrl,
  };

  const timestamp = Date.now();
  const req = createSignedRequest(
    "GET",
    "/api/test",
    {
      "x-meter-tx": "test-tx-sig-facilitator",
      "x-meter-route": "test:v1",
      "x-meter-amt": "0.01",
      "x-meter-currency": "USDC",
      "x-meter-nonce": "test-nonce-facilitator",
      "x-meter-ts": timestamp.toString(),
      "x-meter-agent-kid": keyId,
      date: new Date(timestamp).toUTCString(),
    },
    keypair,
    keyId
  );

  let responseStatus = 0;
  let responseBody: any = null;

  const res = {
    status: (code: number) => {
      responseStatus = code;
      return {
        json: (body: any) => {
          responseBody = body;
        },
      };
    },
  } as Response;

  const middleware = createX402Middleware(options);
  await middleware(req, res, () => {});

  // Verify facilitator was called
  assert.ok(facilitatorCalled, "Facilitator should be called");
  assert.strictEqual(facilitatorRequestBody.txSig, "test-tx-sig-facilitator");
  assert.strictEqual(facilitatorRequestBody.routeId, "test:v1");
  assert.strictEqual(facilitatorRequestBody.amount, 0.01);

  // Restore original fetch
  global.fetch = originalFetch;
});

test("createX402Middleware - falls back to direct verification when facilitator fails", async () => {
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");
  const registry = new MockAgentKeyRegistry();
  const keypair = nacl.sign.keyPair();
  const keyId = "test-agent";

  registry.addKey({
    keyId,
    publicKey: Buffer.from(keypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  const facilitatorUrl = "https://facilitator.example.com";
  let facilitatorCalled = false;

  // Mock fetch to return failed verification
  global.fetch = mock.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/verify")) {
      facilitatorCalled = true;
      return new Response(
        JSON.stringify({
          status: "ok",
          verified: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(url, options);
  }) as any;

  const options: MiddlewareOptions = {
    routeId: "test:v1",
    price: 0.01,
    tokenMint: usdcMint.toString(),
    payTo: Keypair.generate().publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry: registry,
    facilitatorMode: true,
    facilitatorUrl,
  };

  const timestamp = Date.now();
  const req = createSignedRequest(
    "GET",
    "/api/test",
    {
      "x-meter-tx": "test-tx-sig-fallback",
      "x-meter-route": "test:v1",
      "x-meter-amt": "0.01",
      "x-meter-currency": "USDC",
      "x-meter-nonce": "test-nonce-fallback",
      "x-meter-ts": timestamp.toString(),
      "x-meter-agent-kid": keyId,
      date: new Date(timestamp).toUTCString(),
    },
    keypair,
    keyId
  );

  let responseStatus = 0;
  let responseBody: any = null;

  const res = {
    status: (code: number) => {
      responseStatus = code;
      return {
        json: (body: any) => {
          responseBody = body;
        },
      };
    },
  } as Response;

  const middleware = createX402Middleware(options);
  await middleware(req, res, () => {});

  // Verify facilitator was called
  assert.ok(facilitatorCalled, "Facilitator should be called");
  // Payment verification should fail (no real transaction), so we get 402
  assert.strictEqual(responseStatus, 402);
  assert.ok(responseBody?.message?.includes("Payment verification failed"));

  // Restore original fetch
  global.fetch = originalFetch;
});

test("createX402Middleware - falls back to direct verification when facilitator service is unavailable", async () => {
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");
  const registry = new MockAgentKeyRegistry();
  const keypair = nacl.sign.keyPair();
  const keyId = "test-agent";

  registry.addKey({
    keyId,
    publicKey: Buffer.from(keypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  const facilitatorUrl = "https://facilitator.example.com";
  let facilitatorCalled = false;

  // Mock fetch to throw an error (service unavailable)
  global.fetch = mock.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/verify")) {
      facilitatorCalled = true;
      throw new Error("Network error");
    }
    return originalFetch(url, options);
  }) as any;

  const options: MiddlewareOptions = {
    routeId: "test:v1",
    price: 0.01,
    tokenMint: usdcMint.toString(),
    payTo: Keypair.generate().publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry: registry,
    facilitatorMode: true,
    facilitatorUrl,
  };

  const timestamp = Date.now();
  const req = createSignedRequest(
    "GET",
    "/api/test",
    {
      "x-meter-tx": "test-tx-sig-error",
      "x-meter-route": "test:v1",
      "x-meter-amt": "0.01",
      "x-meter-currency": "USDC",
      "x-meter-nonce": "test-nonce-error",
      "x-meter-ts": timestamp.toString(),
      "x-meter-agent-kid": keyId,
      date: new Date(timestamp).toUTCString(),
    },
    keypair,
    keyId
  );

  let responseStatus = 0;
  let responseBody: any = null;

  const res = {
    status: (code: number) => {
      responseStatus = code;
      return {
        json: (body: any) => {
          responseBody = body;
        },
      };
    },
  } as Response;

  const middleware = createX402Middleware(options);
  await middleware(req, res, () => {});

  // Verify facilitator was called
  assert.ok(facilitatorCalled, "Facilitator should be called");
  // Payment verification should fail (no real transaction), so we get 402
  assert.strictEqual(responseStatus, 402);
  assert.ok(responseBody?.message?.includes("Payment verification failed"));

  // Restore original fetch
  global.fetch = originalFetch;
});

test("createX402Middleware - uses direct verification when facilitatorMode is disabled", async () => {
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");
  const registry = new MockAgentKeyRegistry();
  const keypair = nacl.sign.keyPair();
  const keyId = "test-agent";

  registry.addKey({
    keyId,
    publicKey: Buffer.from(keypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  const facilitatorUrl = "https://facilitator.example.com";
  let facilitatorCalled = false;

  // Mock fetch to verify it's not called
  global.fetch = mock.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/verify")) {
      facilitatorCalled = true;
    }
    return originalFetch(url, options);
  }) as any;

  const options: MiddlewareOptions = {
    routeId: "test:v1",
    price: 0.01,
    tokenMint: usdcMint.toString(),
    payTo: Keypair.generate().publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry: registry,
    facilitatorMode: false, // Explicitly disabled
    facilitatorUrl,
  };

  const timestamp = Date.now();
  const req = createSignedRequest(
    "GET",
    "/api/test",
    {
      "x-meter-tx": "test-tx-sig-direct",
      "x-meter-route": "test:v1",
      "x-meter-amt": "0.01",
      "x-meter-currency": "USDC",
      "x-meter-nonce": "test-nonce-direct",
      "x-meter-ts": timestamp.toString(),
      "x-meter-agent-kid": keyId,
      date: new Date(timestamp).toUTCString(),
    },
    keypair,
    keyId
  );

  let responseStatus = 0;
  let responseBody: any = null;

  const res = {
    status: (code: number) => {
      responseStatus = code;
      return {
        json: (body: any) => {
          responseBody = body;
        },
      };
    },
  } as Response;

  const middleware = createX402Middleware(options);
  await middleware(req, res, () => {});

  // Verify facilitator was NOT called
  assert.ok(!facilitatorCalled, "Facilitator should not be called when facilitatorMode is disabled");
  // Payment verification should fail (no real transaction), so we get 402
  assert.strictEqual(responseStatus, 402);

  // Restore original fetch
  global.fetch = originalFetch;
});

test("createX402Middleware - uses direct verification when facilitatorMode is undefined", async () => {
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");
  const registry = new MockAgentKeyRegistry();
  const keypair = nacl.sign.keyPair();
  const keyId = "test-agent";

  registry.addKey({
    keyId,
    publicKey: Buffer.from(keypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  const facilitatorUrl = "https://facilitator.example.com";
  let facilitatorCalled = false;

  // Mock fetch to verify it's not called
  global.fetch = mock.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/verify")) {
      facilitatorCalled = true;
    }
    return originalFetch(url, options);
  }) as any;

  const options: MiddlewareOptions = {
    routeId: "test:v1",
    price: 0.01,
    tokenMint: usdcMint.toString(),
    payTo: Keypair.generate().publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry: registry,
    // facilitatorMode is undefined
    facilitatorUrl,
  };

  const timestamp = Date.now();
  const req = createSignedRequest(
    "GET",
    "/api/test",
    {
      "x-meter-tx": "test-tx-sig-undefined",
      "x-meter-route": "test:v1",
      "x-meter-amt": "0.01",
      "x-meter-currency": "USDC",
      "x-meter-nonce": "test-nonce-undefined",
      "x-meter-ts": timestamp.toString(),
      "x-meter-agent-kid": keyId,
      date: new Date(timestamp).toUTCString(),
    },
    keypair,
    keyId
  );

  let responseStatus = 0;
  let responseBody: any = null;

  const res = {
    status: (code: number) => {
      responseStatus = code;
      return {
        json: (body: any) => {
          responseBody = body;
        },
      };
    },
  } as Response;

  const middleware = createX402Middleware(options);
  await middleware(req, res, () => {});

  // Verify facilitator was NOT called
  assert.ok(!facilitatorCalled, "Facilitator should not be called when facilitatorMode is undefined");
  // Payment verification should fail (no real transaction), so we get 402
  assert.strictEqual(responseStatus, 402);

  // Restore original fetch
  global.fetch = originalFetch;
});

test("createX402Middleware - uses direct verification when facilitatorUrl is missing", async () => {
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");
  const registry = new MockAgentKeyRegistry();
  const keypair = nacl.sign.keyPair();
  const keyId = "test-agent";

  registry.addKey({
    keyId,
    publicKey: Buffer.from(keypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  let facilitatorCalled = false;

  // Mock fetch to verify it's not called
  global.fetch = mock.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/verify")) {
      facilitatorCalled = true;
    }
    return originalFetch(url, options);
  }) as any;

  const options: MiddlewareOptions = {
    routeId: "test:v1",
    price: 0.01,
    tokenMint: usdcMint.toString(),
    payTo: Keypair.generate().publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry: registry,
    facilitatorMode: true,
    // facilitatorUrl is missing
  };

  const timestamp = Date.now();
  const req = createSignedRequest(
    "GET",
    "/api/test",
    {
      "x-meter-tx": "test-tx-sig-no-url",
      "x-meter-route": "test:v1",
      "x-meter-amt": "0.01",
      "x-meter-currency": "USDC",
      "x-meter-nonce": "test-nonce-no-url",
      "x-meter-ts": timestamp.toString(),
      "x-meter-agent-kid": keyId,
      date: new Date(timestamp).toUTCString(),
    },
    keypair,
    keyId
  );

  let responseStatus = 0;
  let responseBody: any = null;

  const res = {
    status: (code: number) => {
      responseStatus = code;
      return {
        json: (body: any) => {
          responseBody = body;
        },
      };
    },
  } as Response;

  const middleware = createX402Middleware(options);
  await middleware(req, res, () => {});

  // Verify facilitator was NOT called
  assert.ok(!facilitatorCalled, "Facilitator should not be called when facilitatorUrl is missing");
  // Payment verification should fail (no real transaction), so we get 402
  assert.strictEqual(responseStatus, 402);

  // Restore original fetch
  global.fetch = originalFetch;
});

test("createX402Middleware - handles facilitator URL with trailing slash", async () => {
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");
  const registry = new MockAgentKeyRegistry();
  const keypair = nacl.sign.keyPair();
  const keyId = "test-agent";

  registry.addKey({
    keyId,
    publicKey: Buffer.from(keypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  const facilitatorUrl = "https://facilitator.example.com/";
  let facilitatorCalledUrl = "";

  // Mock fetch to capture the URL
  global.fetch = mock.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/verify")) {
      facilitatorCalledUrl = url;
      return new Response(
        JSON.stringify({
          status: "ok",
          verified: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(url, options);
  }) as any;

  const options: MiddlewareOptions = {
    routeId: "test:v1",
    price: 0.01,
    tokenMint: usdcMint.toString(),
    payTo: Keypair.generate().publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry: registry,
    facilitatorMode: true,
    facilitatorUrl,
  };

  const timestamp = Date.now();
  const req = createSignedRequest(
    "GET",
    "/api/test",
    {
      "x-meter-tx": "test-tx-sig-trailing",
      "x-meter-route": "test:v1",
      "x-meter-amt": "0.01",
      "x-meter-currency": "USDC",
      "x-meter-nonce": "test-nonce-trailing",
      "x-meter-ts": timestamp.toString(),
      "x-meter-agent-kid": keyId,
      date: new Date(timestamp).toUTCString(),
    },
    keypair,
    keyId
  );

  const res = {
    status: () => ({
      json: () => {},
    }),
  } as Response;

  const middleware = createX402Middleware(options);
  await middleware(req, res, () => {});

  // Verify URL is correctly formatted (no double slash)
  assert.ok(facilitatorCalledUrl.includes("/verify"));
  assert.ok(!facilitatorCalledUrl.includes("//verify"), "URL should not have double slash");

  // Restore original fetch
  global.fetch = originalFetch;
});

