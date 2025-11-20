# Metar: Technical Overview

**Pay-Per-Call SDK for the x402 Protocol**

## What is Metar?

Metar is a complete SDK that enables pay-per-call APIs using the x402 payment protocol on Solana. It provides one-line middleware for providers and automatic payment orchestration for clients, eliminating the need for complex billing infrastructure.

## The Problem

APIs are broken for AI agents. Traditional payment methods require:
- Credit card processors
- Subscription management
- Forms and signups that agents can't complete

**Result**: Most APIs use subscriptions or free tiers, creating friction and complexity.

## The Solution

Metar implements the complete x402 protocol with:
- **One-line middleware** for providers
- **Automatic payment orchestration** for clients
- **Full TAP signature integration** (stateless agent authentication)
- **On-chain payment verification** on Solana

## Architecture

### Core Components

1. **metar-client** - Client SDK for making paid API requests
2. **metar-provider** - Express middleware for payment verification
3. **agent-registry** - Agent key registry service
4. **dashboard** - Usage analytics UI and backend
5. **facilitator** - Facilitator service for payment verification
6. **shared-types** - Shared TypeScript types
7. **shared-config** - Shared configuration constants

### Technology Stack

- **x402 Protocol** - HTTP 402 Payment Required standard
- **Solana USDC** - Fast, cheap micropayments
- **TAP (HTTP Signature)** - Visa's Trusted Agent Protocol using RFC 9421 format
- **Ed25519** - Fast, secure cryptographic signatures
- **TypeScript** - Type-safe implementation

## How It Works

### Payment Flow

1. **Client** fetches price from `/.meter/price?route=summarize:v1`
2. **Client** sends USDC transfer transaction on Solana
3. **Client** creates TAP signature (HTTP Signature format) proving agent identity
4. **Client** makes API request with payment headers
5. **Provider** verifies payment on-chain
6. **Provider** verifies TAP signature cryptographically
7. **Request** proceeds if verification succeeds

### TAP Signature Flow

TAP enables stateless agent authentication using HTTP Signature format (RFC 9421):

1. Agent constructs signature base string from request headers
2. Agent signs base string with ed25519 private key
3. Agent sends HTTP Signature header: `Signature keyId="...", alg="ed25519", ...`
4. Provider looks up agent's public key from registry
5. Provider reconstructs base string and verifies signature
6. Request proceeds if signature valid

**Why TAP Matters**: Traditional authentication (cookies, sessions, forms) doesn't work for AI agents. TAP provides cryptographic proof of identity without session management—exactly what the agentic economy needs.

## Security Features

- **Nonce replay protection** - Prevents request replay attacks
- **Timestamp validation** - Rejects expired requests (>5 minutes)
- **On-chain verification** - Verifies payment transactions on Solana
- **Cryptographic signatures** - Ed25519 signatures for agent authentication
- **Idempotency checks** - Optional transaction reuse prevention

## Code Examples

### Provider (One Line)

```typescript
app.post(
  "/api/summarize",
  createX402Middleware({
    routeId: "summarize:v1",
    price: 0.03,
    tokenMint: usdcMint,
    payTo: providerWallet,
    chain: "solana-devnet",
    connection,
    agentRegistry,
  }),
  handler
);
```

### Client (Automatic Payment)

```typescript
const client = new MetarClient({
  providerBaseURL: "https://api.example.com",
  agentKeyId: "my-agent-1",
  agentPrivateKey: agentKeypair.secretKey,
  wallet,
  connection,
  chain: "solana-devnet",
});

// Payment happens automatically!
const response = await client.request("summarize", {
  method: "POST",
  body: JSON.stringify({ text: "..." }),
});
```

## Key Features

✅ **One-line middleware** - Protect routes with a single function call  
✅ **Automatic payments** - Client SDK handles entire payment flow  
✅ **Full x402 compliance** - Complete protocol implementation  
✅ **TAP signature integration** - Stateless agent authentication  
✅ **Production-ready** - Comprehensive tests and error handling  
✅ **Usage dashboard** - Real-time analytics and metrics  
✅ **Facilitator mode** - Optional centralized payment verification  

## Impact

**For Developers**: Build pay-per-call APIs in minutes, not weeks  
**For AI Agents**: Automatic micropayments, no forms or signups  
**For Solana**: Grow x402 ecosystem, enable agentic economy  

## Getting Started

See [QUICKSTART.md](./QUICKSTART.md) for step-by-step instructions.

Run the demo:
```bash
# Terminal 1: Start provider
cd packages/examples && npm run demo:provider

# Terminal 2: Run client
cd packages/examples && npm run demo:client -- --provider http://localhost:3000 --text "Your text"
```

## Project Status

✅ Complete x402 protocol implementation  
✅ Full TAP signature support (HTTP Signature format)  
✅ Production-ready codebase  
✅ Comprehensive test coverage  
✅ Working demos and examples  
✅ Usage analytics dashboard  

**Metar isn't just a tool—it's the missing economic layer for the agentic web.**

