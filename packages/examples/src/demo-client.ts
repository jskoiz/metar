#!/usr/bin/env node
/**
 * Demo Client Script
 *
 * This script demonstrates the x402 payment flow:
 * 1. Price lookup
 * 2. Payment execution
 * 3. API call with payment proof
 * 4. Result display
 *
 * Usage:
 *   npm run demo:client -- --provider http://localhost:3000 --text "Your text to summarize"
 */

import { Connection, Keypair } from "@solana/web3.js";
import { MetarClient, createNodeWallet, getPrice, InsufficientBalanceError } from "@metar/metar-client";
import { createConnection, getUSDCMint } from "@metar/shared-config";
import nacl from "tweetnacl";

interface DemoOptions {
  providerUrl: string;
  text: string;
  agentKeyId?: string;
  network?: "devnet" | "mainnet";
  privateKey?: string;
}

async function runDemo(options: DemoOptions): Promise<void> {
  const { providerUrl, text, agentKeyId = "demo-agent-1", network = "devnet", privateKey } = options;

  console.log("🚀 x402 Demo Client");
  console.log("==================\n");

  // Setup
  console.log("📋 Configuration:");
  console.log(`   Provider URL: ${providerUrl}`);
  console.log(`   Network: ${network}`);
  console.log(`   Agent Key ID: ${agentKeyId}\n`);

  // Create connection
  const connection = createConnection(network);
  console.log(`✅ Connected to Solana ${network}\n`);

  // Generate or use existing keypair
  // In production, you would load this from a secure location
  let keypair: Keypair;
  if (privateKey) {
    // Load from provided private key (supports both base58 and base64)
    try {
      let secretKey: Uint8Array;
      
      // Try base64 first
      try {
        secretKey = Uint8Array.from(Buffer.from(privateKey, "base64"));
        if (secretKey.length === 64) {
          // Valid base64 encoded 64-byte key
          keypair = Keypair.fromSecretKey(secretKey);
        } else {
          throw new Error("Base64 decode didn't produce 64 bytes");
        }
      } catch {
        // Try base58 (common Solana wallet format)
        try {
          const bs58 = require("bs58");
          secretKey = bs58.decode(privateKey);
          if (secretKey.length === 64) {
            keypair = Keypair.fromSecretKey(secretKey);
          } else {
            throw new Error("Base58 decode didn't produce 64 bytes");
          }
        } catch (base58Error) {
          throw new Error("Failed to decode private key as base64 or base58");
        }
      }
    } catch (error) {
      console.error("❌ Failed to load private key:", error);
      console.error("   The private key should be:");
      console.error("   - Base64 encoded (64 bytes = 88 base64 characters), OR");
      console.error("   - Base58 encoded (64 bytes)");
      console.error("   Example: Get your private key from your wallet and provide it as-is");
      process.exit(1);
    }
  } else {
    keypair = Keypair.generate();
  }
  const wallet = createNodeWallet(keypair);

  console.log("🔑 Wallet:");
  console.log(`   Solana Wallet (base58): ${keypair.publicKey.toBase58()}`);
  console.log(`   Solana Wallet (base64): ${Buffer.from(keypair.publicKey.toBuffer()).toString("base64")}`);
  console.log(`\n💡 Note: TAP agent keypair will be generated separately for signatures\n`);

  // Step 1: Price Lookup
  console.log("💰 Step 1: Price Lookup");
  console.log("   Fetching price for route 'summarize:v1'...");

  let priceInfo;
  try {
    priceInfo = await getPrice(providerUrl, "summarize:v1");
    console.log("   ✅ Price retrieved:");
    console.log(`      Route: ${priceInfo.routeId}`);
    console.log(`      Price: ${priceInfo.price} ${priceInfo.currency}`);
    console.log(`      Pay To: ${priceInfo.payTo}`);
    console.log(`      Mint: ${priceInfo.mint}`);
    console.log(`      Chain: ${priceInfo.chain}\n`);
  } catch (error) {
    console.error("   ❌ Failed to get price:", error);
    throw error;
  }

  // Step 2: Check balance (informational)
  console.log("💵 Step 2: Wallet Balance Check");
  try {
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / 1e9;
    console.log(`   SOL Balance: ${solBalance.toFixed(4)} SOL`);

    if (solBalance < 0.01) {
      console.log(
        "   ⚠️  Warning: Low SOL balance. You may need to airdrop SOL for transaction fees."
      );
      console.log(
        `   💡 Run: solana airdrop 1 ${keypair.publicKey.toBase58()} --url ${network === "devnet" ? "devnet" : "mainnet-beta"}\n`
      );
    } else {
      console.log("   ✅ Sufficient SOL for transaction fees\n");
    }
  } catch (error) {
    console.log("   ⚠️  Could not check balance:", error);
  }

  // Step 3: Generate TAP agent keypair (separate from Solana wallet)
  console.log("🔧 Step 3: Creating MetarClient");
  console.log("   Generating TAP agent keypair for signatures...");
  
  // Generate Ed25519 keypair for TAP signatures (separate from Solana wallet)
  const agentKeypair = nacl.sign.keyPair();
  const agentPublicKeyBase64 = Buffer.from(agentKeypair.publicKey).toString("base64");
  
  const client = new MetarClient({
    providerBaseURL: providerUrl,
    agentKeyId,
    agentPrivateKey: agentKeypair.secretKey, // Use TAP keypair, not Solana wallet
    wallet,
    connection,
    chain: network === "devnet" ? "solana-devnet" : "solana",
  });
  console.log("   ✅ MetarClient created");
  console.log(`   TAP Agent Public Key (base64): ${agentPublicKeyBase64}\n`);

  // Step 4: Register agent with provider (for demo)
  console.log("🔐 Step 4: Registering Agent");
  console.log(`   Registering agent '${agentKeyId}' with provider...`);

  try {
    // Register the TAP agent public key (not the Solana wallet public key)
    const registerResponse = await fetch(`${providerUrl}/.meter/register-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyId: agentKeyId,
        publicKey: agentPublicKeyBase64, // Use TAP agent public key
      }),
    });

    if (registerResponse.ok) {
      console.log("   ✅ Agent registered successfully\n");
    } else {
      const error = await registerResponse.json().catch(() => ({}));
      console.log(`   ⚠️  Agent registration failed: ${JSON.stringify(error)}`);
      console.log("   Continuing anyway (agent may already be registered)\n");
    }
  } catch (error) {
    console.log(`   ⚠️  Could not register agent: ${error}`);
    console.log("   Continuing anyway (agent may already be registered)\n");
  }

  // Step 5: Make API call (this will handle payment automatically)
  console.log("📡 Step 5: Making Paid API Request");
  console.log(`   Route: /api/summarize`);
  console.log(`   Text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"\n`);

  try {
    const response = await client.request("summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    console.log("   ✅ API Request Successful!");
    console.log(`   Status: ${response.status} ${response.statusText}\n`);

    // Step 6: Display Results
    console.log("📄 Step 6: Results");
    console.log("==================\n");
    console.log(JSON.stringify(result, null, 2));
    console.log("\n✅ Demo completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during API request:");
    
    // Handle InsufficientBalanceError with helpful instructions
    if (error instanceof InsufficientBalanceError) {
      console.error(`   ${error.message}`);
      if (error.recovery) {
        console.error(`\n   💡 ${error.recovery}`);
      }
      console.error(`\n   📋 To fix this issue:`);
      console.error(`   1. Ensure you have SOL for transaction fees:`);
      console.error(`      solana airdrop 1 ${keypair.publicKey.toBase58()} --url ${network === "devnet" ? "devnet" : "mainnet-beta"}`);
      console.error(`   2. You need a USDC token account with balance.`);
      console.error(`      - The token account may need to be created first`);
      if (priceInfo) {
        console.error(`      - You need at least ${priceInfo.price} USDC in your account`);
        console.error(`      - USDC Mint: ${priceInfo.mint}`);
      }
      console.error(`   3. For devnet, you may need to use a USDC faucet or transfer from another account`);
      throw error;
    }
    
    // Handle other errors
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error(`\n   Stack trace:\n${error.stack}`);
      }
    } else {
      console.error(`   ${String(error)}`);
    }
    throw error;
  }
}

// Parse command line arguments
function parseArgs(): DemoOptions {
  const args = process.argv.slice(2);
  const options: Partial<DemoOptions> = {
    providerUrl: "http://localhost:3000",
    text: "This is a sample text to summarize. It demonstrates the x402 payment protocol.",
    network: "devnet",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--provider" && i + 1 < args.length) {
      options.providerUrl = args[++i];
    } else if (arg === "--text" && i + 1 < args.length) {
      options.text = args[++i];
    } else if (arg === "--agent-key-id" && i + 1 < args.length) {
      options.agentKeyId = args[++i];
    } else if (arg === "--network" && i + 1 < args.length) {
      const network = args[++i];
      if (network === "devnet" || network === "mainnet") {
        options.network = network;
      } else {
        console.error(`Invalid network: ${network}. Must be 'devnet' or 'mainnet'`);
        process.exit(1);
      }
    } else if (arg === "--private-key" && i + 1 < args.length) {
      options.privateKey = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: npm run demo:client [options]

Options:
  --provider <url>     Provider URL (default: http://localhost:3000)
  --text <text>        Text to summarize
  --agent-key-id <id>  Agent key ID (default: demo-agent-1)
  --network <network>  Network: devnet or mainnet (default: devnet)
  --private-key <key>  Private key (base58 or base64 encoded, 64 bytes) to use instead of generating new wallet
  --help, -h           Show this help message

Example:
  npm run demo:client -- --provider http://localhost:3000 --text "Hello world"
  
  # Using an existing wallet:
  npm run demo:client -- --private-key <base64-key> --provider http://localhost:3000 --text "Hello world"
      `);
      process.exit(0);
    }
  }

  return options as DemoOptions;
}

// Run demo if executed directly
if (require.main === module) {
  const options = parseArgs();
  runDemo(options).catch(error => {
    console.error("\n💥 Demo failed:", error);
    process.exit(1);
  });
}

export { runDemo };
