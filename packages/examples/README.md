# x402 Demo Examples

This package contains demo implementations showing how to use the x402 payment protocol with the Metar SDK.

## Overview

The demo includes:

1. **Demo Client** - A Node.js script demonstrating the complete payment flow
2. **Demo Provider** - An Express server with a protected API endpoint

## Prerequisites

- **Node.js** 18+ (v22+ recommended)
  - Note: Node.js v20.6.0+ and v22+ use `--import` instead of `--loader` flag
- **npm** 9+
- **Solana CLI** (optional, for airdropping SOL on devnet)
- A Solana wallet with:
  - **SOL** for transaction fees (can airdrop on devnet)
  - **USDC** balance in an associated token account (for payments)

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

**Option A: Generate New Wallet** (default)

In another terminal, run the client:

```bash
npm run demo:client -- --provider http://localhost:3000 --text "Your text to summarize here"
```

**Option B: Use Existing Wallet**

If you have a wallet with funds, use the `--private-key` flag:

```bash
npm run demo:client -- --private-key <your-base58-or-base64-key> --provider http://localhost:3000 --text "Your text to summarize here"
```

The private key can be in base58 (common in Solana wallets like Phantom) or base64 format. The demo will detect the format automatically.

**What the Client Does:**

1. ✅ Connect to Solana devnet
2. ✅ Generate or load wallet (Solana keypair for payments)
3. ✅ Generate **separate TAP agent keypair** (Ed25519 for signatures)
4. ✅ Look up the price for the route
5. ✅ Check wallet balance (SOL and USDC)
6. ✅ Register TAP agent public key with provider
7. ✅ Create a MetarClient instance
8. ✅ Make a paid API request (payment happens automatically)
   - Creates token accounts if needed
   - Sends USDC payment
   - Signs request with TAP agent keypair
9. ✅ Display the results

**Important**: The TAP agent keypair is **separate** from your Solana wallet. This is required by the Trusted Agent Protocol specification.

## Command Line Options

### Demo Client

```bash
npm run demo:client [options]

Options:
  --provider <url>     Provider URL (default: http://localhost:3000)
  --text <text>        Text to summarize
  --agent-key-id <id>  Agent key ID (default: demo-agent-1)
  --network <network>  Network: devnet or mainnet (default: devnet)
  --private-key <key>  Private key (base58 or base64 encoded, 64 bytes) to use instead of generating new wallet
  --help, -h           Show help message

Examples:
  # Generate new wallet
  npm run demo:client -- --provider http://localhost:3000 --text "Hello world"
  
  # Use existing wallet
  npm run demo:client -- --private-key <base58-key> --provider http://localhost:3000 --text "Hello world"
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
   Solana Wallet (base58): 7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz
   Solana Wallet (base64): d2F0Y2hvdXRmb3J0aGlzYmFzZTY0ZW5jb2RlZHB1YmxpY2tleQ==

💡 Note: TAP agent keypair will be generated separately for signatures

🔧 Step 3: Creating MetarClient
   Generating TAP agent keypair for signatures...
   ✅ MetarClient created
   TAP Agent Public Key (base64): <base64-encoded-ed25519-public-key>

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

### "Insufficient balance" or "no record of a prior credit" error

If you see an insufficient balance error:

1. **SOL balance**: Make sure you have SOL in your wallet for transaction fees
   - On devnet, airdrop SOL: `solana airdrop 1 <YOUR_PUBLIC_KEY> --url devnet`
   
2. **USDC token account**: The error "no record of a prior credit" means your USDC token account doesn't exist or has no balance
   - Token accounts are automatically created when needed
   - You still need SOL for the creation transaction fee
   - You need USDC balance in the account (at least the payment amount)
   
3. **USDC balance**: You need sufficient USDC in your associated token account
   - On devnet, you may need to use a faucet or mint tokens if you have mint authority
   - Devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

### "Payment verification failed" error

This usually means:

1. The transaction hasn't been confirmed yet (wait a few seconds and retry)
2. The transaction signature is invalid
3. The payment amount doesn't match the required price

### "Invalid agent signature" error

This usually means:

1. **Agent not registered**: The TAP agent public key wasn't registered successfully
   - Check the registration step in client output
   - The demo client automatically registers, but registration can fail
   
2. **Wrong public key**: Make sure you're registering the **TAP agent public key**, not the Solana wallet public key
   - The demo generates a separate Ed25519 keypair for TAP signatures
   - Look for "TAP Agent Public Key (base64)" in the client output
   
3. **Path mismatch**: Signature base string path doesn't match between client and server
   - This has been fixed in the codebase
   - Enable debug logging to see the exact mismatch: `DEBUG_TAP=true npm run demo:client ...`
   
4. **Key ID mismatch**: Agent key ID in headers doesn't match registered key

**Debug**: Enable debug logging to see what's happening:

```bash
# Client side
DEBUG_TAP=true npm run demo:client -- --provider http://localhost:3000 --text "Test"

# Provider side (in provider terminal)
DEBUG_TAP=true npm run demo:provider
```

**Manual Registration**: If automatic registration fails, manually register the TAP agent public key:

```bash
curl -X POST http://localhost:3000/.meter/register-agent \
  -H "Content-Type: application/json" \
  -d '{"keyId": "demo-agent-1", "publicKey": "<TAP-AGENT-PUBLIC-KEY-BASE64>"}'
```

Note: Use the TAP agent public key (shown as "TAP Agent Public Key (base64)"), not the Solana wallet public key.

### Connection errors

If you can't connect to Solana:

1. Check your internet connection
2. Try using a different RPC endpoint (set `SOLANA_DEVNET_RPC_URL` environment variable)
3. Verify the network setting matches between client and provider

### Node.js compatibility issues

If you see `Error: tsx must be loaded with --import instead of --loader`:

- This has been fixed in the codebase
- Node.js v20.6.0+ and v22+ require `--import` flag instead of `--loader`
- Ensure you're using the latest version of the codebase

### Token account creation

Token accounts are automatically created when needed, but you may see errors if:

- The wallet doesn't have SOL for the creation transaction fee
- Network issues prevent the transaction from completing

**Solution**: Ensure sufficient SOL balance before making payments.

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
2. **Client** generates separate TAP agent keypair (Ed25519) for signatures
3. **Client** builds USDC transfer transaction (creates token accounts if needed)
4. **Client** sends payment transaction to Solana
5. **Client** constructs TAP signature using agent keypair
6. **Client** registers TAP agent public key with provider
7. **Client** makes API request with payment headers and TAP signature
8. **Provider** verifies payment on-chain
9. **Provider** verifies TAP agent signature
10. **Provider** processes request and returns result

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
