#!/usr/bin/env node
/**
 * Demo Provider Server
 *
 * Simple Express server demonstrating x402 payment protection:
 * - Protected /api/summarize route
 * - Price endpoint at /.meter/price
 * - Mock summary generation
 *
 * Usage:
 *   npm run demo:provider
 */

import express from "express";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createX402Middleware, AgentKeyRegistry } from "@metar/metar-provider";
import { createConnection, getUSDCMint } from "@metar/shared-config";
import { AgentKey, PriceResponse } from "@metar/shared-types";

// Simple in-memory agent registry for demo
class DemoAgentRegistry implements AgentKeyRegistry {
  private agents = new Map<string, AgentKey>();

  registerAgent(keyId: string, publicKey: string): void {
    this.agents.set(keyId, {
      keyId,
      publicKey,
      algorithm: "ed25519",
    });
  }

  async lookupAgentKey(keyId: string): Promise<AgentKey | null> {
    return this.agents.get(keyId) || null;
  }
}

// Create agent registry
const agentRegistry = new DemoAgentRegistry();

// Register a demo agent (in production, this would come from a real registry)
// The public key should match the agent's actual public key
// For demo purposes, we'll accept any key that's registered
function registerDemoAgent(keyId: string, publicKeyBase64: string): void {
  agentRegistry.registerAgent(keyId, publicKeyBase64);
}

// Mock summary function
function generateMockSummary(text: string): string {
  const words = text.split(/\s+/);
  const wordCount = words.length;

  // Simple mock summary: first 20 words + "..."
  const summary = words.slice(0, 20).join(" ");
  return `${summary}... [Summary of ${wordCount} words]`;
}

async function createDemoServer(options: {
  port?: number;
  network?: "devnet" | "mainnet";
  price?: number;
  payTo?: string;
}): Promise<void> {
  const { port = 3000, network = "devnet", price = 0.03, payTo } = options;

  const app = express();
  app.use(express.json());

  // Create connection
  const connection = createConnection(network);
  const usdcMint = getUSDCMint(network);

  // Generate provider wallet if not provided
  const providerKeypair = payTo ? { publicKey: new PublicKey(payTo) } : Keypair.generate();
  const providerAddress = providerKeypair.publicKey.toBase58();

  console.log("🚀 x402 Demo Provider Server");
  console.log("============================\n");
  console.log("📋 Configuration:");
  console.log(`   Port: ${port}`);
  console.log(`   Network: ${network}`);
  console.log(`   USDC Mint: ${usdcMint.toBase58()}`);
  console.log(`   Provider Address: ${providerAddress}`);
  console.log(`   Route Price: ${price} USDC\n`);

  // Price endpoint
  app.get("/.meter/price", (req, res) => {
    const routeId = (req.query.route as string) || "summarize:v1";

    const priceResponse: PriceResponse = {
      price,
      currency: "USDC",
      mint: usdcMint.toBase58(),
      payTo: providerAddress,
      routeId,
      chain: network === "devnet" ? "solana-devnet" : "solana",
    };

    res.json(priceResponse);
  });

  // Protected summarize endpoint
  app.post(
    "/api/summarize",
    createX402Middleware({
      routeId: "summarize:v1",
      price,
      tokenMint: usdcMint.toBase58(),
      payTo: providerAddress,
      chain: network === "devnet" ? "solana-devnet" : "solana",
      connection,
      agentRegistry,
    }),
    (req, res) => {
      const { text } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing or invalid 'text' field in request body",
        });
      }

      // Generate mock summary
      const summary = generateMockSummary(text);

      // Access payment info from middleware
      const payment = (req as any).payment;

      return res.json({
        summary,
        metadata: {
          routeId: "summarize:v1",
          paymentTx: payment?.txSig,
          timestamp: Date.now(),
        },
      });
    }
  );

  // Agent registration endpoint (for demo purposes)
  app.post("/.meter/register-agent", express.json(), (req, res) => {
    const { keyId, publicKey } = req.body;

    if (!keyId || !publicKey) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing 'keyId' or 'publicKey' in request body",
      });
    }

    registerDemoAgent(keyId, publicKey);
    
    // Debug: Log registration (only if DEBUG_TAP is enabled)
    if (process.env.DEBUG_TAP === "true") {
      console.log(`[PROVIDER] Registered agent: ${keyId}`);
      console.log(`[PROVIDER] Public key (first 20 chars): ${publicKey.substring(0, 20)}...`);
    }

    return res.json({
      status: "ok",
      message: `Agent ${keyId} registered successfully`,
      timestamp: Date.now(),
    });
  });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      network,
      providerAddress,
      timestamp: Date.now(),
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
    console.log(`\n📡 Available endpoints:`);
    console.log(`   GET  /.meter/price?route=summarize:v1  - Get price for route`);
    console.log(`   POST /.meter/register-agent            - Register an agent (demo)`);
    console.log(`   POST /api/summarize                    - Protected summarize endpoint`);
    console.log(`   GET  /health                           - Health check\n`);
    console.log(`💡 Register agents via POST /.meter/register-agent with:`);
    console.log(`   { "keyId": "demo-agent-1", "publicKey": "base64publickey..." }\n`);
  });
}

// Parse command line arguments
function parseArgs(): {
  port?: number;
  network?: "devnet" | "mainnet";
  price?: number;
  payTo?: string;
} {
  const args = process.argv.slice(2);
  const options: {
    port?: number;
    network?: "devnet" | "mainnet";
    price?: number;
    payTo?: string;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--port" && i + 1 < args.length) {
      options.port = parseInt(args[++i], 10);
    } else if (arg === "--network" && i + 1 < args.length) {
      const network = args[++i];
      if (network === "devnet" || network === "mainnet") {
        options.network = network;
      } else {
        console.error(`Invalid network: ${network}. Must be 'devnet' or 'mainnet'`);
        process.exit(1);
      }
    } else if (arg === "--price" && i + 1 < args.length) {
      options.price = parseFloat(args[++i]);
    } else if (arg === "--pay-to" && i + 1 < args.length) {
      options.payTo = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: npm run demo:provider [options]

Options:
  --port <port>        Server port (default: 3000)
  --network <network>   Network: devnet or mainnet (default: devnet)
  --price <price>      Price in USDC (default: 0.03)
  --pay-to <address>   Provider wallet address (default: generated)
  --help, -h           Show this help message

Example:
  npm run demo:provider -- --port 3000 --network devnet
      `);
      process.exit(0);
    }
  }

  return options;
}

// Export for use in other modules
export { createDemoServer, registerDemoAgent, agentRegistry };

// Run server if executed directly
if (require.main === module) {
  const options = parseArgs();
  createDemoServer(options).catch(error => {
    console.error("💥 Server failed to start:", error);
    process.exit(1);
  });
}
