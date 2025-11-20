# x402 Demo Examples

This package contains demo implementations showing how to use the x402 payment protocol with the Metar SDK.

## Overview

The demo includes:

1. **Demo Client** - A Node.js script demonstrating the complete payment flow
2. **Demo Provider** - An Express server with a protected API endpoint

## Prerequisites

- Node.js 18+ and npm 9+
- Solana CLI (optional, for airdropping SOL on devnet)
- A Solana wallet with some SOL for transaction fees (on devnet, you can airdrop)

## Setup

1. **Install dependencies** (from the monorepo root):

   ```bash
   npm install
   ```

2. **Build all packages**:

   ```bash
   npm run build
   ```

3. **Build the examples package**:
   ```bash
   cd packages/examples
   npm run build
   ```

## Running the Demo

### Step 1: Start the Demo Provider

In one terminal, start the provider server:

```bash
npm run demo:provider
```

This will start an Express server on `http://localhost:3000` with:

- `GET /.meter/price?route=summarize:v1` - Price lookup endpoint
- `POST /api/summarize` - Protected summarize endpoint (requires payment)
- `GET /health` - Health check endpoint

The server will display:

- Provider wallet address (where payments are sent)
- Network configuration
- Available endpoints

**Note**: The provider generates a new wallet on startup. In production, you would use a fixed wallet address.

### Step 2: Run the Demo Client

The client will automatically register itself with the provider when it runs, so no manual registration is needed!

In another terminal, run the client:

```bash
npm run demo:client -- --provider http://localhost:3000 --text "Your text to summarize here"
```

The client will:

1. ✅ Connect to Solana devnet
2. ✅ Generate a wallet and display public keys
3. ✅ Look up the price for the route
4. ✅ Check wallet balance
5. ✅ Register agent with provider
6. ✅ Create a MetarClient instance
7. ✅ Make a paid API request (payment happens automatically)
8. ✅ Display the results

## Command Line Options

### Demo Client

```bash
npm run demo:client [options]

Options:
  --provider <url>     Provider URL (default: http://localhost:3000)
  --text <text>        Text to summarize
  --agent-key-id <id>  Agent key ID (default: demo-agent-1)
  --network <network>  Network: devnet or mainnet (default: devnet)
  --help, -h           Show help message
```

### Demo Provider

```bash
npm run demo:provider [options]

Options:
  --port <port>        Server port (default: 3000)
  --network <network>  Network: devnet or mainnet (default: devnet)
  --price <price>      Price in USDC (default: 0.03)
  --pay-to <address>   Provider wallet address (default: generated)
  --help, -h           Show help message
```

## Expected Output

### Demo Client Output

```
🚀 x402 Demo Client
==================

📋 Configuration:
   Provider URL: http://localhost:3000
   Network: devnet
   Agent Key ID: demo-agent-1

   ✅ Connected to Solana devnet

🔑 Wallet:
   Public Key (base58): 7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz
   Public Key (base64): d2F0Y2hvdXRmb3J0aGlzYmFzZTY0ZW5jb2RlZHB1YmxpY2tleQ==

💡 To register this agent with the provider, use:
   Register agent: demo-agent-1 -> d2F0Y2hvdXRmb3J0aGlzYmFzZTY0ZW5jb2RlZHB1YmxpY2tleQ==

💰 Step 1: Price Lookup
   Fetching price for route 'summarize:v1'...
   ✅ Price retrieved:
      Route: summarize:v1
      Price: 0.03 USDC
      Pay To: 7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz
      Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
      Chain: solana-devnet

💵 Step 2: Wallet Balance Check
   SOL Balance: 1.0000 SOL
   ✅ Sufficient SOL for transaction fees

🔧 Step 3: Creating MetarClient
   ✅ MetarClient created

🔐 Step 4: Registering Agent
   Registering agent 'demo-agent-1' with provider...
   ✅ Agent registered successfully

📡 Step 5: Making Paid API Request
   Route: /api/summarize
   Text: "Your text to summarize here"

   ✅ API Request Successful!
   Status: 200 OK

📄 Step 6: Results
==================

{
  "summary": "Your text to summarize here... [Summary of 5 words]",
  "metadata": {
    "routeId": "summarize:v1",
    "paymentTx": "5j7s8K9mN0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8z",
    "timestamp": 1234567890123
  }
}

✅ Demo completed successfully!
```

### Demo Provider Output

```
🚀 x402 Demo Provider Server
============================

📋 Configuration:
   Port: 3000
   Network: devnet
   USDC Mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
   Provider Address: 7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz
   Route Price: 0.03 USDC

✅ Server running on http://localhost:3000

📡 Available endpoints:
   GET  /.meter/price?route=summarize:v1  - Get price for route
   POST /.meter/register-agent            - Register an agent (demo)
   POST /api/summarize                    - Protected summarize endpoint
   GET  /health                           - Health check

💡 Register agents via POST /.meter/register-agent with:
   { "keyId": "demo-agent-1", "publicKey": "base64publickey..." }
```

## Troubleshooting

### "Insufficient balance" error

If you see an insufficient balance error:

1. Make sure you have SOL in your wallet for transaction fees
2. On devnet, airdrop SOL: `solana airdrop 1 <YOUR_PUBLIC_KEY> --url devnet`
3. Note: You'll also need USDC tokens for the payment itself. On devnet, you may need to use a faucet or mint tokens if you have mint authority.

### "Payment verification failed" error

This usually means:

1. The transaction hasn't been confirmed yet (wait a few seconds and retry)
2. The transaction signature is invalid
3. The payment amount doesn't match the required price

### "Invalid agent signature" error

This usually means:

1. The agent wasn't registered successfully (check the registration step in client output)
2. The public key format is incorrect
3. The agent key ID doesn't match

The demo client should automatically register itself, but if it fails, you can manually register:

```bash
curl -X POST http://localhost:3000/.meter/register-agent \
  -H "Content-Type: application/json" \
  -d '{"keyId": "demo-agent-1", "publicKey": "YOUR_BASE64_PUBLIC_KEY"}'
```

### Connection errors

If you can't connect to Solana:

1. Check your internet connection
2. Try using a different RPC endpoint (set `SOLANA_DEVNET_RPC_URL` environment variable)
3. Verify the network setting matches between client and provider

## Testing on Devnet

The demo is configured to use Solana devnet by default. This is perfect for testing because:

- Transactions are free (no real money)
- You can airdrop SOL for testing
- Fast confirmation times

To test on devnet:

1. **Airdrop SOL** (if needed):

   ```bash
   solana airdrop 1 <YOUR_PUBLIC_KEY> --url devnet
   ```

2. **Get devnet USDC**:
   - Devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
   - You may need to use a faucet or have mint authority to get USDC tokens

3. **Run the demo** as described above

## Architecture

### Payment Flow

1. **Client** requests price from `/.meter/price`
2. **Client** builds USDC transfer transaction
3. **Client** sends payment transaction to Solana
4. **Client** constructs TAP signature for authentication
5. **Client** makes API request with payment headers
6. **Provider** verifies payment on-chain
7. **Provider** verifies agent signature
8. **Provider** processes request and returns result

### Key Components

- **MetarClient**: High-level client SDK for making paid requests
- **createX402Middleware**: Express middleware for protecting routes
- **Agent Registry**: Simple in-memory registry for demo (production would use a real registry)

## Next Steps

- Integrate with a real agent registry
- Add more example routes
- Implement usage tracking and analytics
- Add support for refunds
- Add support for subscription models

## References

- [x402 Protocol Overview](../../research/x402-protocol-overview.md)
- [Client SDK Patterns](../../research/x402-client-sdk-patterns.md)
- [Provider Middleware Patterns](../../research/x402-provider-middleware-patterns.md)
