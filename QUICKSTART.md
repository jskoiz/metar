# Quick Start Guide

Get started with Metar SDK in minutes. This guide shows you how to use the x402 payment protocol as either a **client** (making paid requests) or a **provider** (protecting your API routes).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Client Quick Start](#client-quick-start)
- [Provider Quick Start](#provider-quick-start)
- [Running the Demo](#running-the-demo)
- [Common Examples](#common-examples)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** >= 18.0.0 (v22+ recommended)
  - **Note**: Node.js v20.6.0+ and v22+ use `--import` instead of `--loader` flag for tsx
  - The codebase has been updated to use `--import` for compatibility
- **npm** >= 9.0.0
- **Solana Wallet** (for testing on devnet/mainnet)
- Basic familiarity with TypeScript/JavaScript

---

## Installation

### Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd 402

# Install dependencies
npm install

# Build all packages
npm run build
```

### Install Individual Packages (if using as npm packages)

```bash
# For client applications
npm install @metar/metar-client

# For provider applications
npm install @metar/metar-provider

# Shared types and config
npm install @metar/shared-types @metar/shared-config
```

---

## Client Quick Start

Make paid API requests with just a few lines of code.

### 1. Basic Setup

```typescript
import { MetarClient, createNodeWallet } from "@metar/metar-client";
import { Connection, Keypair } from "@solana/web3.js";
import { createConnection } from "@metar/shared-config";
import nacl from "tweetnacl";

// Create Solana connection (devnet for testing)
const connection = createConnection("devnet");

// Generate or load your wallet keypair
const keypair = Keypair.generate(); // In production, load from secure storage
const wallet = createNodeWallet(keypair);

// Generate agent keypair for TAP signatures
const agentKeypair = nacl.sign.keyPair();
const agentKeyId = "my-agent-1";

// Create MetarClient
const client = new MetarClient({
  providerBaseURL: "https://api.example.com",
  agentKeyId: agentKeyId,
  agentPrivateKey: agentKeypair.secretKey,
  wallet: wallet,
  connection: connection,
  chain: "solana-devnet", // or "solana" for mainnet
});
```

### 2. Make a Paid Request

```typescript
// Make a paid API request
// Payment happens automatically!
const response = await client.request("summarize", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: "This is a long article that needs to be summarized...",
  }),
});

const result = await response.json();
console.log("Summary:", result.summary);
```

### 3. Complete Example

```typescript
import { MetarClient, createNodeWallet } from "@metar/metar-client";
import { Connection, Keypair } from "@solana/web3.js";
import { createConnection } from "@metar/shared-config";
import nacl from "tweetnacl";

async function makePaidRequest() {
  // Setup
  const connection = createConnection("devnet");
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);
  const agentKeypair = nacl.sign.keyPair();

  // Create client
  const client = new MetarClient({
    providerBaseURL: "http://localhost:3000",
    agentKeyId: "my-agent-1",
    agentPrivateKey: agentKeypair.secretKey,
    wallet: wallet,
    connection: connection,
    chain: "solana-devnet",
  });

  // Make request (payment happens automatically)
  try {
    const response = await client.request("summarize", {
      method: "POST",
      body: JSON.stringify({ text: "Your text here" }),
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Success:", data);
    } else {
      console.error("Request failed:", response.status);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

makePaidRequest();
```

### What Happens Behind the Scenes

1. **Price Lookup**: Client fetches price from `/.meter/price?route=summarize:v1`
2. **Payment**: Client builds and sends USDC transfer transaction on Solana
3. **TAP Signature**: Client creates HTTP Signature (RFC 9421) with ed25519 proving agent identity
4. **Request**: Client makes API request with payment headers and TAP signature
5. **Verification**: Provider verifies payment on-chain and verifies TAP signature cryptographically
6. **Processing**: Request proceeds if all verifications succeed

**Note**: TAP (Trusted Agent Protocol) enables stateless agent authentication using HTTP Signature format. This is critical for AI agents that can't use traditional authentication methods like cookies or sessions.

---

## Provider Quick Start

Protect your API routes with one line of middleware.

### 1. Basic Setup

```typescript
import express from "express";
import { createX402Middleware } from "@metar/metar-provider";
import { createConnection, getUSDCMint } from "@metar/shared-config";
import { AgentKeyRegistry } from "@metar/shared-types";

const app = express();
app.use(express.json());

// Create Solana connection
const connection = createConnection("devnet");
const usdcMint = getUSDCMint("devnet");

// Setup agent registry (in production, use a real registry service)
const agentRegistry: AgentKeyRegistry = {
  async lookupAgentKey(keyId: string) {
    // Lookup agent key from your registry
    // Return AgentKey or null if not found
    return null;
  },
};

// Provider wallet address (where payments are sent)
const providerWallet = "YOUR_WALLET_ADDRESS_HERE";
```

### 2. Protect a Route

```typescript
// Protect your API route with x402 middleware
app.post(
  "/api/summarize",
  createX402Middleware({
    routeId: "summarize:v1",
    price: 0.03, // Price in USDC
    tokenMint: usdcMint.toBase58(),
    payTo: providerWallet,
    chain: "solana-devnet",
    connection: connection,
    agentRegistry: agentRegistry,
  }),
  (req, res) => {
    // Your route handler - payment already verified!
    const { text } = req.body;

    // Access payment info if needed
    const payment = (req as any).payment;
    console.log("Payment tx:", payment.txSig);

    // Your business logic here
    const summary = generateSummary(text);

    res.json({ summary });
  }
);
```

### 3. Add Price Endpoint

```typescript
import { priceEndpoint } from "@metar/agent-registry";

// Add price lookup endpoint
app.get("/.meter/price", priceEndpoint);

// Or implement custom price endpoint
app.get("/.meter/price", (req, res) => {
  const routeId = req.query.route as string;

  res.json({
    price: 0.03,
    currency: "USDC",
    mint: usdcMint.toBase58(),
    payTo: providerWallet,
    routeId: routeId || "summarize:v1",
    chain: "solana-devnet",
  });
});
```

### 4. Complete Example

```typescript
import express from "express";
import { createX402Middleware } from "@metar/metar-provider";
import { createConnection, getUSDCMint } from "@metar/shared-config";
import { AgentKeyRegistry, AgentKey } from "@metar/shared-types";

const app = express();
app.use(express.json());

// Configuration
const PORT = 3000;
const connection = createConnection("devnet");
const usdcMint = getUSDCMint("devnet");
const providerWallet = "YOUR_WALLET_ADDRESS";

// Simple in-memory agent registry (use real registry in production)
const agents = new Map<string, AgentKey>();
const agentRegistry: AgentKeyRegistry = {
  async lookupAgentKey(keyId: string): Promise<AgentKey | null> {
    return agents.get(keyId) || null;
  },
};

// Price endpoint
app.get("/.meter/price", (req, res) => {
  const routeId = (req.query.route as string) || "summarize:v1";
  res.json({
    price: 0.03,
    currency: "USDC",
    mint: usdcMint.toBase58(),
    payTo: providerWallet,
    routeId,
    chain: "solana-devnet",
  });
});

// Protected route
app.post(
  "/api/summarize",
  createX402Middleware({
    routeId: "summarize:v1",
    price: 0.03,
    tokenMint: usdcMint.toBase58(),
    payTo: providerWallet,
    chain: "solana-devnet",
    connection,
    agentRegistry,
  }),
  (req, res) => {
    const { text } = req.body;
    const summary = `Summary of: ${text}`;
    res.json({ summary });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## Running the Demo

The fastest way to see Metar in action:

### 1. Start the Provider

```bash
# Terminal 1
cd packages/examples
npm run demo:provider
```

This starts a demo server on `http://localhost:3000` with:

- `GET /.meter/price?route=summarize:v1` - Price lookup
- `POST /api/summarize` - Protected summarize endpoint
- `POST /.meter/register-agent` - Agent registration (for demo)

### 2. Run the Client

```bash
# Terminal 2
cd packages/examples
npm run demo:client -- --provider http://localhost:3000 --text "Your text to summarize"
```

The client will:

1. Look up the price
2. Send payment automatically
3. Make the API request
4. Display the result

---

## Common Examples

### Example 1: Browser Wallet Integration

```typescript
import { MetarClient, createBrowserWallet } from "@metar/metar-client";
import { WalletAdapter } from "@solana/wallet-adapter-base";

// Use browser wallet adapter (e.g., Phantom)
const browserWallet = createBrowserWallet(walletAdapter);

const client = new MetarClient({
  providerBaseURL: "https://api.example.com",
  agentKeyId: "browser-agent-1",
  agentPrivateKey: agentKeypair.secretKey,
  wallet: browserWallet,
  connection: connection,
  chain: "solana-devnet",
});
```

### Example 2: Multiple Routes with Different Prices

```typescript
// Provider side - protect multiple routes
app.post(
  "/api/summarize",
  createX402Middleware({
    routeId: "summarize:v1",
    price: 0.03,
    // ... other options
  }),
  summarizeHandler
);

app.post(
  "/api/resize-image",
  createX402Middleware({
    routeId: "resize-image:v1",
    price: 0.05, // Different price
    // ... other options
  }),
  resizeImageHandler
);
```

### Example 3: Usage Logging

```typescript
import { logUsage, isTransactionUsed } from "@metar/metar-provider";
import { Database } from "sqlite3";

const db = new Database("usage.db");

app.post(
  "/api/summarize",
  createX402Middleware({
    routeId: "summarize:v1",
    price: 0.03,
    // ... other options
    isTransactionUsed: async (txSig: string) => {
      return await isTransactionUsed(db, txSig);
    },
    logUsage: async (headers: PaymentHeaders) => {
      await logUsage(db, headers, headers.payer);
    },
  }),
  handler
);
```

### Example 4: Facilitator Mode

```typescript
// Use facilitator service for payment verification
app.post(
  "/api/summarize",
  createX402Middleware({
    routeId: "summarize:v1",
    price: 0.03,
    // ... other options
    facilitatorMode: true,
    facilitatorUrl: "https://facilitator.example.com",
  }),
  handler
);
```

### Example 5: Error Handling

```typescript
import {
  PaymentRequiredError,
  PaymentVerificationError,
  InsufficientBalanceError,
} from "@metar/metar-client";

try {
  const response = await client.request("summarize", options);
  // Handle success
} catch (error) {
  if (error instanceof PaymentRequiredError) {
    console.error("Payment required:", error.details);
  } else if (error instanceof PaymentVerificationError) {
    console.error("Payment verification failed:", error.details);
  } else if (error instanceof InsufficientBalanceError) {
    console.error("Insufficient balance:", error.details);
  } else {
    console.error("Other error:", error);
  }
}
```

---

## Troubleshooting

### "Insufficient balance" or "no record of a prior credit" Error

**Problem**: Wallet doesn't have enough SOL, USDC, or the USDC token account doesn't exist.

**Common Causes**:

1. **No SOL balance**: Need SOL for transaction fees
2. **USDC token account doesn't exist**: The associated token account may need to be created
3. **Insufficient USDC balance**: Not enough USDC in the token account

**Solution**:

```bash
# 1. Airdrop SOL on devnet for transaction fees
solana airdrop 1 <YOUR_PUBLIC_KEY> --url devnet

# 2. Ensure USDC token account exists and has balance
# Token accounts are automatically created when needed, but you need:
# - SOL for the creation transaction fee
# - USDC balance in the account (at least the payment amount)

# For USDC on devnet, you may need to:
# 1. Use a devnet USDC faucet
# 2. Mint tokens if you have mint authority
# 3. Transfer from another devnet account
```

**Note**: The SDK automatically creates token accounts if they don't exist, but you still need SOL for the creation transaction fee.

### "Payment verification failed" Error

**Problem**: Transaction not found or verification failed.

**Solutions**:

1. Wait a few seconds for transaction confirmation
2. Check transaction signature is correct
3. Verify payment amount matches required price
4. Ensure transaction is on the correct network (devnet vs mainnet)

### "Invalid agent signature" Error

**Problem**: Agent key not registered or signature invalid.

**Common Causes**:

1. **Agent key not registered**: The TAP agent public key must be registered with the provider
2. **Path mismatch**: Signature base string path doesn't match (e.g., trailing `?` when no query params)
3. **Wrong keypair**: Using Solana wallet key instead of separate TAP agent keypair
4. **Key ID mismatch**: Agent key ID in headers doesn't match registered key

**Solutions**:

1. **Register the agent**: Make sure the TAP agent public key (not Solana wallet public key) is registered:
   ```bash
   curl -X POST http://localhost:3000/.meter/register-agent \
     -H "Content-Type: application/json" \
     -d '{"keyId": "demo-agent-1", "publicKey": "<TAP-agent-public-key-base64>"}'
   ```

2. **Use separate TAP keypair**: The demo automatically generates a separate Ed25519 keypair for TAP signatures. Don't use your Solana wallet key for TAP signatures.

3. **Enable debug logging**: See exactly what's happening:
   ```bash
   DEBUG_TAP=true npm run demo:client -- --provider http://localhost:3000 --text "Test"
   ```
   This shows the signature base string construction and verification details.

4. **Check path construction**: Ensure the path used in signature matches exactly (no trailing `?` if no query parameters)

### "Request expired" Error

**Problem**: Request timestamp is too old (>5 minutes).

**Solution**: Make a fresh request with a new timestamp.

### Connection Errors

**Problem**: Can't connect to Solana RPC.

**Solutions**:

1. Check internet connection
2. Try different RPC endpoint:
   ```typescript
   const connection = new Connection("https://api.devnet.solana.com", "confirmed");
   ```
3. Set custom RPC URL:
   ```bash
   export SOLANA_DEVNET_RPC_URL="https://your-rpc-endpoint.com"
   ```

### Build Errors

**Problem**: TypeScript compilation fails.

**Solutions**:

1. Ensure Node.js >= 18.0.0 (v22+ recommended)
2. If you see `Error: tsx must be loaded with --import instead of --loader`:
   - This has been fixed in the codebase
   - Ensure you're using the latest version
   - Node.js v20.6.0+ and v22+ require `--import` flag
3. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
4. Rebuild packages:
   ```bash
   npm run build
   ```

### Debug Mode

Enable detailed debug logging to troubleshoot issues:

**Client Side**:
```bash
DEBUG_TAP=true npm run demo:client -- --provider http://localhost:3000 --text "Test"
```

**Provider Side**:
```bash
DEBUG_TAP=true npm run demo:provider
```

This will show:
- Signature base string construction (client)
- Signature base string reconstruction (provider)
- Agent key lookup results
- Signature verification details
- Any mismatches or errors

Use this to diagnose "Invalid agent signature" errors and other TAP-related issues.

---

## Next Steps

### Documentation

- **[Technical Overview](./TECHNICAL_OVERVIEW.md)** - High-level technical overview for hackathon judges
- **[README](./README.md)** - Project overview and development guide

### For Clients

- [Read Client SDK Documentation](../packages/metar-client/README.md)
- [Explore Client Examples](../packages/examples/src/demo-client.ts)
- [Review Client SDK Patterns](../research/x402-client-sdk-patterns.md)

### For Providers

- [Read Provider Documentation](../packages/metar-provider/README.md)
- [Explore Provider Examples](../packages/examples/src/demo-provider.ts)
- [Review Provider Middleware Patterns](../research/x402-provider-middleware-patterns.md)

### General

- [Technical Specifications](./hackathon/technical-specifications.md)
- [Project Outline](./hackathon/project-outline.md)
- [x402 Protocol Overview](./research/x402-protocol-overview.md)

---

## Getting Help

- Check the [Troubleshooting](#troubleshooting) section above
- Review the [examples](../packages/examples/) directory
- Read the [alignment verification report](./hackathon/alignment-verification-report.md) for spec details
- Check test files for usage examples

---

**Ready to build?** Start with the [Demo](#running-the-demo) or jump to [Client Quick Start](#client-quick-start) or [Provider Quick Start](#provider-quick-start)!
