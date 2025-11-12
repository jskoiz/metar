/**
 * End-to-End Integration Tests for x402 Payment Protocol
 * 
 * Tests the complete payment flow from client to provider:
 * 1. Provider server with protected route (/api/summarize)
 * 2. Registry/price service for price lookup
 * 3. Client using MeterClient to make paid requests
 * 4. Full payment flow: getPrice -> payment -> request -> verification
 * 5. Error cases: 402 handling, invalid payment, nonce reuse
 * 
 * Uses Solana devnet for testing.
 * Set SKIP_INTEGRATION_TESTS=true to skip these tests.
 * 
 * @see {@link file://research/x402-protocol-overview.md | x402 Protocol Overview}
 * @see {@link file://research/x402-implementation-guide.md | Implementation Guide}
 */

import { test } from "node:test";
import assert from "node:assert";
import express, { Express, Request, Response } from "express";
import { Server } from "http";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MeterClient, createNodeWallet, clearPriceCache } from "@meter/meter-client";
import { createX402Middleware, MiddlewareOptions, AgentKeyRegistry } from "@meter/meter-provider";
import { AgentKey } from "@meter/shared-types";
import { priceEndpoint, setPrice } from "@meter/agent-registry";
import { createConnection, getUSDCMint } from "@meter/shared-config";

// Skip integration tests if SKIP_INTEGRATION_TESTS env var is set
const skipIntegration = process.env.SKIP_INTEGRATION_TESTS === "true";

// Test configuration
const PROVIDER_PORT = 3002;
const REGISTRY_PORT = 3003;
const PROVIDER_BASE_URL = `http://localhost:${PROVIDER_PORT}`;
const REGISTRY_BASE_URL = `http://localhost:${REGISTRY_PORT}`;
const ROUTE_ID = "summarize:v1";
const PRICE = 0.03;

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

// Helper to start Express server
function startServer(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Test server listening on port ${port}`);
      resolve(server);
    });
    server.on("error", reject);
  });
}

// Helper to stop Express server
function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper to fund account with SOL
async function fundAccountWithSOL(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 0.1
): Promise<string> {
  // Request airdrop
  const signature = await connection.requestAirdrop(publicKey, amount * 1e9);
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

// Helper to fund account with USDC
async function fundAccountWithUSDC(
  connection: Connection,
  payer: Keypair,
  recipient: PublicKey,
  amount: number,
  usdcMint: PublicKey
): Promise<string> {
  // Get or create associated token account for recipient
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    usdcMint,
    recipient
  );

  // Get or create associated token account for payer
  const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    usdcMint,
    payer.publicKey
  );

  // Mint tokens to payer account
  const mintInfo = await getMint(connection, usdcMint);
  const decimals = mintInfo.decimals;
  const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, decimals)));

  await mintTo(
    connection,
    payer,
    usdcMint,
    payerTokenAccount.address,
    payer,
    amountInSmallestUnit
  );

  // Transfer tokens to recipient
  const { transfer } = await import("@solana/spl-token");
  const signature = await transfer(
    connection,
    payer,
    payerTokenAccount.address,
    recipientTokenAccount.address,
    payer,
    amountInSmallestUnit
  );

  return signature;
}

test("E2E: Full payment flow from client to provider", { skip: skipIntegration }, async () => {
  // Setup: Create connections and keypairs
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");

  // Generate keypairs
  const providerKeypair = Keypair.generate();
  const clientKeypair = Keypair.generate();
  const agentKeypair = nacl.sign.keyPair();
  const agentKeyId = "test-agent-1";

  // Fund accounts with SOL for transaction fees
  console.log("Funding accounts with SOL...");
  await fundAccountWithSOL(connection, providerKeypair.publicKey, 0.1);
  await fundAccountWithSOL(connection, clientKeypair.publicKey, 0.1);

  // Fund client with USDC for payments
  console.log("Funding client with USDC...");
  // Create a mint authority keypair for devnet USDC
  // Note: On devnet, we may need to use a different approach
  // For now, we'll use a test mint or skip this if USDC isn't available
  try {
    await fundAccountWithUSDC(
      connection,
      providerKeypair, // Using provider as mint authority for testing
      clientKeypair.publicKey,
      PRICE * 10, // Fund with 10x the price
      usdcMint
    );
  } catch (error) {
    console.warn("Could not fund with USDC, test may fail:", error);
    // Continue anyway - the test will fail at payment if USDC is needed
  }

  // Setup agent registry
  const agentRegistry = new MockAgentKeyRegistry();
  agentRegistry.addKey({
    keyId: agentKeyId,
    publicKey: Buffer.from(agentKeypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  // Setup price service
  setPrice(ROUTE_ID, {
    price: PRICE,
    currency: "USDC",
    mint: usdcMint.toString(),
    payTo: providerKeypair.publicKey.toString(),
    routeId: ROUTE_ID,
    chain: "solana-devnet",
  });

  // Start registry/price service
  const registryApp = express();
  registryApp.use(express.json());
  registryApp.get("/.meter/price", priceEndpoint);
  const registryServer = await startServer(registryApp, REGISTRY_PORT);

  // Start provider server
  const providerApp = express();
  providerApp.use(express.json());

  const middlewareOptions: MiddlewareOptions = {
    routeId: ROUTE_ID,
    price: PRICE,
    tokenMint: usdcMint.toString(),
    payTo: providerKeypair.publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry,
  };

  // Add price endpoint to provider server (client will look for prices here)
  providerApp.get("/.meter/price", priceEndpoint);
  
  providerApp.get(
    `/api/${ROUTE_ID.split(":")[0]}`,
    createX402Middleware(middlewareOptions),
    (req: Request, res: Response) => {
      res.json({
        success: true,
        summary: "This is a test summary",
        payment: (req as any).payment,
      });
    }
  );

  const providerServer = await startServer(providerApp, PROVIDER_PORT);

  try {
    // Clear price cache
    clearPriceCache();

    // Create client
    const wallet = createNodeWallet(clientKeypair);
    
    const client = new MeterClient({
      providerBaseURL: PROVIDER_BASE_URL,
      agentKeyId: agentKeyId,
      agentPrivateKey: new Uint8Array(agentKeypair.secretKey),
      wallet,
      connection,
      chain: "solana-devnet",
    });

    // Make paid request
    console.log("Making paid request...");
    const response = await client.request(ROUTE_ID.split(":")[0], {
      method: "GET",
    });

    // Verify response
    assert.strictEqual(response.status, 200, "Request should succeed with payment");
    const data = await response.json();
    assert.strictEqual(data.success, true, "Response should indicate success");
    assert.strictEqual(data.summary, "This is a test summary", "Response should contain summary");
    assert.ok(data.payment, "Response should contain payment info");

    console.log("✓ Full payment flow test passed");
  } finally {
    // Cleanup
    await stopServer(providerServer);
    await stopServer(registryServer);
  }
});

test("E2E: 402 response handling", { skip: skipIntegration }, async () => {
  // Setup: Create connections and keypairs
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");

  const providerKeypair = Keypair.generate();
  const clientKeypair = Keypair.generate();
  const agentKeypair = nacl.sign.keyPair();
  const agentKeyId = "test-agent-2";

  // Fund accounts
  await fundAccountWithSOL(connection, providerKeypair.publicKey, 0.1);
  await fundAccountWithSOL(connection, clientKeypair.publicKey, 0.1);

  // Setup agent registry
  const agentRegistry = new MockAgentKeyRegistry();
  agentRegistry.addKey({
    keyId: agentKeyId,
    publicKey: Buffer.from(agentKeypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  // Setup price service
  setPrice(ROUTE_ID, {
    price: PRICE,
    currency: "USDC",
    mint: usdcMint.toString(),
    payTo: providerKeypair.publicKey.toString(),
    routeId: ROUTE_ID,
    chain: "solana-devnet",
  });

  // Start registry/price service
  const registryApp = express();
  registryApp.use(express.json());
  registryApp.get("/.meter/price", priceEndpoint);
  const registryServer = await startServer(registryApp, REGISTRY_PORT);

  // Start provider server
  const providerApp = express();
  providerApp.use(express.json());

  const middlewareOptions: MiddlewareOptions = {
    routeId: ROUTE_ID,
    price: PRICE,
    tokenMint: usdcMint.toString(),
    payTo: providerKeypair.publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry,
  };

  providerApp.get(
    `/api/${ROUTE_ID.split(":")[0]}`,
    createX402Middleware(middlewareOptions),
    (req: Request, res: Response) => {
      res.json({ success: true });
    }
  );

  const providerServer = await startServer(providerApp, PROVIDER_PORT);

  try {
    // Make request without payment (should get 402)
    clearPriceCache();
    const response = await fetch(`${PROVIDER_BASE_URL}/api/${ROUTE_ID.split(":")[0]}`);

    assert.strictEqual(response.status, 402, "Should return 402 without payment");
    const data = await response.json();
    assert.strictEqual(data.error, "Payment Required", "Error should indicate payment required");
    assert.strictEqual(data.route, ROUTE_ID, "Should include route ID");
    assert.strictEqual(data.amount, PRICE, "Should include price");

    console.log("✓ 402 response handling test passed");
  } finally {
    await stopServer(providerServer);
    await stopServer(registryServer);
  }
});

test("E2E: Invalid payment rejection", { skip: skipIntegration }, async () => {
  // Setup: Create connections and keypairs
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");

  const providerKeypair = Keypair.generate();
  const clientKeypair = Keypair.generate();
  const agentKeypair = nacl.sign.keyPair();
  const agentKeyId = "test-agent-3";

  // Fund accounts
  await fundAccountWithSOL(connection, providerKeypair.publicKey, 0.1);
  await fundAccountWithSOL(connection, clientKeypair.publicKey, 0.1);

  // Setup agent registry
  const agentRegistry = new MockAgentKeyRegistry();
  agentRegistry.addKey({
    keyId: agentKeyId,
    publicKey: Buffer.from(agentKeypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  // Setup price service
  setPrice(ROUTE_ID, {
    price: PRICE,
    currency: "USDC",
    mint: usdcMint.toString(),
    payTo: providerKeypair.publicKey.toString(),
    routeId: ROUTE_ID,
    chain: "solana-devnet",
  });

  // Start registry/price service
  const registryApp = express();
  registryApp.use(express.json());
  registryApp.get("/.meter/price", priceEndpoint);
  const registryServer = await startServer(registryApp, REGISTRY_PORT);

  // Start provider server
  const providerApp = express();
  providerApp.use(express.json());

  const middlewareOptions: MiddlewareOptions = {
    routeId: ROUTE_ID,
    price: PRICE,
    tokenMint: usdcMint.toString(),
    payTo: providerKeypair.publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry,
  };

  providerApp.get(
    `/api/${ROUTE_ID.split(":")[0]}`,
    createX402Middleware(middlewareOptions),
    (req: Request, res: Response) => {
      res.json({ success: true });
    }
  );

  const providerServer = await startServer(providerApp, PROVIDER_PORT);

  try {
    // Make request with invalid payment transaction signature
    const invalidTxSig = "invalid-transaction-signature";
    const timestamp = Date.now();
    const nonce = "test-nonce-invalid-payment";

    // Construct signature base string
    const method = "GET";
    const path = `/api/${ROUTE_ID.split(":")[0]}`;
    const date = new Date(timestamp).toUTCString();
    const baseString = [
      `(request-target): ${method.toLowerCase()} ${path}`,
      `date: ${date}`,
      `x-meter-nonce: ${nonce}`,
      `x-meter-tx: ${invalidTxSig}`,
    ].join("\n");

    const message = new TextEncoder().encode(baseString);
    const signature = nacl.sign.detached(message, agentKeypair.secretKey);
    const signatureBase64 = Buffer.from(signature).toString("base64");

    const response = await fetch(`${PROVIDER_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        "x-meter-tx": invalidTxSig,
        "x-meter-route": ROUTE_ID,
        "x-meter-amt": PRICE.toString(),
        "x-meter-currency": "USDC",
        "x-meter-nonce": nonce,
        "x-meter-ts": timestamp.toString(),
        "x-meter-agent-kid": agentKeyId,
        authorization: `Signature keyId="${agentKeyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signatureBase64}"`,
        date: date,
      },
    });

    assert.strictEqual(response.status, 402, "Should reject invalid payment");
    const data = await response.json();
    assert.ok(
      data.message?.includes("Payment verification failed") ||
        data.message?.includes("verification") ||
        data.error === "Payment Required",
      "Should indicate payment verification failed"
    );

    console.log("✓ Invalid payment rejection test passed");
  } finally {
    await stopServer(providerServer);
    await stopServer(registryServer);
  }
});

test("E2E: Nonce reuse rejection", { skip: skipIntegration }, async () => {
  // Setup: Create connections and keypairs
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");

  const providerKeypair = Keypair.generate();
  const clientKeypair = Keypair.generate();
  const agentKeypair = nacl.sign.keyPair();
  const agentKeyId = "test-agent-4";

  // Fund accounts
  await fundAccountWithSOL(connection, providerKeypair.publicKey, 0.1);
  await fundAccountWithSOL(connection, clientKeypair.publicKey, 0.1);

  // Setup agent registry
  const agentRegistry = new MockAgentKeyRegistry();
  agentRegistry.addKey({
    keyId: agentKeyId,
    publicKey: Buffer.from(agentKeypair.publicKey).toString("base64"),
    algorithm: "ed25519",
  });

  // Setup price service
  setPrice(ROUTE_ID, {
    price: PRICE,
    currency: "USDC",
    mint: usdcMint.toString(),
    payTo: providerKeypair.publicKey.toString(),
    routeId: ROUTE_ID,
    chain: "solana-devnet",
  });

  // Start registry/price service
  const registryApp = express();
  registryApp.use(express.json());
  registryApp.get("/.meter/price", priceEndpoint);
  const registryServer = await startServer(registryApp, REGISTRY_PORT);

  // Start provider server
  const providerApp = express();
  providerApp.use(express.json());

  const middlewareOptions: MiddlewareOptions = {
    routeId: ROUTE_ID,
    price: PRICE,
    tokenMint: usdcMint.toString(),
    payTo: providerKeypair.publicKey.toString(),
    chain: "solana-devnet",
    connection,
    agentRegistry,
  };

  providerApp.get(
    `/api/${ROUTE_ID.split(":")[0]}`,
    createX402Middleware(middlewareOptions),
    (req: Request, res: Response) => {
      res.json({ success: true });
    }
  );

  const providerServer = await startServer(providerApp, PROVIDER_PORT);

  try {
    const reusedNonce = "test-nonce-reuse";
    const timestamp1 = Date.now();
    const timestamp2 = Date.now() + 1000;
    const txSig1 = "test-tx-sig-1";
    const txSig2 = "test-tx-sig-2";

    // Helper to create signed request
    const createSignedRequest = (txSig: string, timestamp: number) => {
      const method = "GET";
      const path = `/api/${ROUTE_ID.split(":")[0]}`;
      const date = new Date(timestamp).toUTCString();
      const baseString = [
        `(request-target): ${method.toLowerCase()} ${path}`,
        `date: ${date}`,
        `x-meter-nonce: ${reusedNonce}`,
        `x-meter-tx: ${txSig}`,
      ].join("\n");

      const message = new TextEncoder().encode(baseString);
      const signature = nacl.sign.detached(message, agentKeypair.secretKey);
      const signatureBase64 = Buffer.from(signature).toString("base64");

      return {
        method: "GET",
        headers: {
          "x-meter-tx": txSig,
          "x-meter-route": ROUTE_ID,
          "x-meter-amt": PRICE.toString(),
          "x-meter-currency": "USDC",
          "x-meter-nonce": reusedNonce,
          "x-meter-ts": timestamp.toString(),
          "x-meter-agent-kid": agentKeyId,
          authorization: `Signature keyId="${agentKeyId}", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="${signatureBase64}"`,
          date: date,
        },
      };
    };

    // First request (will fail at payment verification, but nonce will be consumed)
    const response1 = await fetch(
      `${PROVIDER_BASE_URL}/api/${ROUTE_ID.split(":")[0]}`,
      createSignedRequest(txSig1, timestamp1)
    );
    assert.strictEqual(response1.status, 402, "First request should fail (invalid payment)");

    // Second request with same nonce (should fail at nonce check)
    const response2 = await fetch(
      `${PROVIDER_BASE_URL}/api/${ROUTE_ID.split(":")[0]}`,
      createSignedRequest(txSig2, timestamp2)
    );
    assert.strictEqual(response2.status, 402, "Second request should fail (nonce reuse)");
    const data2 = await response2.json();
    assert.ok(
      data2.message?.includes("nonce") || data2.message === "Invalid or reused nonce",
      "Should indicate nonce reuse"
    );

    console.log("✓ Nonce reuse rejection test passed");
  } finally {
    await stopServer(providerServer);
    await stopServer(registryServer);
  }
});

