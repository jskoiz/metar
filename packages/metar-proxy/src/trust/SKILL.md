---
name: x-data-api
version: "1.0.0"
description: >
  Pay-per-call X (Twitter) data API powered by the x402 payment protocol.
  No subscriptions, no API keys, no credit cards — just a crypto wallet and
  per-request USDC micropayments on Solana. Fetch tweets, user profiles, timelines,
  follower graphs, and more. Built for AI agents, scripts, and autonomous systems.
author: Metar
protocol: x402
chains:
  - solana
  - solana-devnet
auth_modes:
  - x402-tap
  - x402-fetch
base_url: https://metar.api
artifacts:
  skill: https://metar.api/api/skill/SKILL.md
  install: https://metar.api/api/skill/install.sh
  trust: https://metar.api/api/trust
  pricing: https://metar.api/api/pricing
  info: https://metar.api/api/info
tags:
  - twitter
  - x
  - social-data
  - x402
  - micropayments
  - solana
  - ai-agents
---

# Metar — X Data API

> **The missing data layer for the agentic web.** Pay per call. No forms. No subscriptions. Just data.

Metar is a **pay-per-call X (Twitter) data proxy** built on the [x402 payment protocol](https://github.com/coinbase/x402). Send a USDC micropayment, get data. That's it.

Perfect for AI agents that can't fill out forms, scripts that need on-demand data, and developers who want to pay only for what they use.

---

## Quick Start

### Option 1: x402-fetch (recommended for agents)

```bash
npm install x402-fetch viem
```

```typescript
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: base, transport: http() });
const fetch = wrapFetchWithPayment(globalThis.fetch, wallet);

// Fetch a tweet — payment handled automatically
const res = await fetch("https://metar.api/api/x/tweet/1234567890");
const tweet = await res.json();
console.log(tweet);
```

### Option 2: Metar SDK (Solana native)

```bash
npm install @metar/metar-client
```

```typescript
import { MetarClient, createNodeWallet } from "@metar/metar-client";
import { createConnection } from "@metar/shared-config";
import { Keypair } from "@solana/web3.js";

const keypair = Keypair.fromSecretKey(Buffer.from(process.env.WALLET_PRIVATE_KEY!, "base64"));
const wallet = createNodeWallet(keypair);
const connection = createConnection("mainnet");

const client = new MetarClient({
  providerBaseURL: "https://metar.api",
  agentKeyId: "my-agent",
  agentPrivateKey: keypair.secretKey,
  wallet,
  connection,
  chain: "solana",
});

const response = await client.request("tweet:lookup", {
  method: "GET",
  headers: { "x-tweet-id": "1234567890" },
});
const tweet = await response.json();
```

### Option 3: Run the installer

```bash
curl -fsSL https://metar.api/api/skill/install.sh | bash
```

---

## Why Use This?

| Problem | Traditional APIs | Metar X Data API |
|---|---|---|
| Agent can't fill a form | ❌ Blocked | ✅ Pay-per-call, no forms |
| Monthly bill when idle | ❌ Pay anyway | ✅ Pay only when used |
| Rate limits by tier | ❌ Upgrade required | ✅ Pay more, get more |
| Credit card required | ❌ Human intervention | ✅ Wallet signs automatically |
| API key rotation | ❌ Manual process | ✅ No keys, just payments |

**Built for:**
- 🤖 AI agents and autonomous systems
- ⚡ Serverless functions and edge compute
- 🔁 Batch processing pipelines
- 🛠️ Developer scripts and prototypes
- 🔗 Microservices with usage-based billing

---

## Supported Chains

### Solana (Primary)
- **Token**: USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- **Speed**: ~400ms finality
- **Cost**: ~$0.00025 per transaction fee
- **Networks**: `solana` (mainnet), `solana-devnet`
- **Packages**: `@metar/metar-client`, `x402-solana`

### Base (EVM)
- **Token**: USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Speed**: ~2s finality
- **Cost**: ~$0.001 per transaction fee
- **Network**: `base`
- **Packages**: `x402-fetch`, `viem`

### Ethereum (EVM)
- **Token**: USDC (`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`)
- **Speed**: ~12s finality
- **Cost**: ~$0.50+ per transaction fee (use Base for cheaper fees)
- **Network**: `ethereum`
- **Packages**: `x402-fetch`, `viem`

---

## Auth Modes

### x402-TAP (Solana native)
Uses Visa's **Trusted Agent Protocol (TAP)** — a stateless, cryptographic identity system for agents:
- Ed25519 keypair signs every request
- No sessions, no tokens, no state
- Works in serverless, edge, and distributed systems
- Replay-attack resistant (nonces + timestamps)

```
Authorization: Signature keyId="<agentId>", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="<base64>"
```

### x402-fetch (EVM chains)
Standard x402 protocol via `x402-fetch` package:
- EIP-712 signed payment authorization
- Works with any EVM wallet (viem, ethers, wagmi)
- No custom headers — just wrap `fetch`

---

## All Routes + Prices

### Tweet Endpoints

| Route | Method | Path | Price | Description |
|---|---|---|---|---|
| `tweet:lookup` | GET | `/api/x/tweet/:id` | $0.002 USDC | Single tweet by ID |
| `tweet:batch` | POST | `/api/x/tweets` | $0.008 USDC | Up to 100 tweets by ID |
| `tweet:search:recent` | GET | `/api/x/search/recent` | $0.01 USDC | Recent tweets search |
| `tweet:search:all` | GET | `/api/x/search/all` | $0.025 USDC | Full-archive search |
| `tweet:thread` | GET | `/api/x/thread/:id` | $0.015 USDC | Full conversation thread |
| `tweet:replies` | GET | `/api/x/tweet/:id/replies` | $0.01 USDC | Tweet replies |
| `tweet:quotes` | GET | `/api/x/tweet/:id/quotes` | $0.01 USDC | Quote tweets |
| `tweet:retweets` | GET | `/api/x/tweet/:id/retweets` | $0.008 USDC | Retweeters list |
| `tweet:likers` | GET | `/api/x/tweet/:id/likers` | $0.008 USDC | Tweet likers list |

### User Endpoints

| Route | Method | Path | Price | Description |
|---|---|---|---|---|
| `user:lookup` | GET | `/api/x/user/:username` | $0.002 USDC | User profile by username |
| `user:lookup:id` | GET | `/api/x/user/id/:id` | $0.002 USDC | User profile by ID |
| `user:batch` | POST | `/api/x/users` | $0.008 USDC | Up to 100 users |
| `user:timeline` | GET | `/api/x/user/:id/tweets` | $0.01 USDC | User's tweet timeline |
| `user:mentions` | GET | `/api/x/user/:id/mentions` | $0.01 USDC | Mentions of user |
| `user:followers` | GET | `/api/x/user/:id/followers` | $0.015 USDC | Follower list |
| `user:following` | GET | `/api/x/user/:id/following` | $0.015 USDC | Following list |
| `user:liked` | GET | `/api/x/user/:id/liked` | $0.01 USDC | Tweets liked by user |

### List Endpoints

| Route | Method | Path | Price | Description |
|---|---|---|---|---|
| `list:tweets` | GET | `/api/x/list/:id/tweets` | $0.01 USDC | Tweets from a list |
| `list:members` | GET | `/api/x/list/:id/members` | $0.01 USDC | List members |
| `list:lookup` | GET | `/api/x/list/:id` | $0.002 USDC | List metadata |

### Trending / Discovery

| Route | Method | Path | Price | Description |
|---|---|---|---|---|
| `trends:lookup` | GET | `/api/x/trends` | $0.01 USDC | Trending topics (WOEID) |
| `spaces:search` | GET | `/api/x/spaces/search` | $0.01 USDC | Search Spaces |

### Meta Endpoints (free)

| Path | Description |
|---|---|
| `GET /.meter/price?route=<routeId>` | Price lookup for any route |
| `GET /api/info` | Service status and metadata |
| `GET /api/trust` | Trust manifest (machine-readable) |
| `GET /api/pricing` | Full pricing JSON |
| `GET /api/skill/SKILL.md` | This file |
| `GET /api/skill/install.sh` | Setup script |
| `GET /.well-known/trust.json` | Trust artifact (agent discovery) |

---

## Code Examples

### Solana — Fetch User Profile

```typescript
import { MetarClient, createNodeWallet } from "@metar/metar-client";
import { createConnection } from "@metar/shared-config";
import { Keypair } from "@solana/web3.js";

async function getUserProfile(username: string) {
  const keypair = Keypair.fromSecretKey(
    Buffer.from(process.env.WALLET_PRIVATE_KEY!, "base64")
  );
  const wallet = createNodeWallet(keypair);
  const connection = createConnection("mainnet");

  const client = new MetarClient({
    providerBaseURL: "https://metar.api",
    agentKeyId: "my-agent-v1",
    agentPrivateKey: keypair.secretKey,
    wallet,
    connection,
    chain: "solana",
  });

  // Automatically fetches price, pays, and requests
  const response = await client.request("user:lookup", {
    method: "GET",
    // Route maps to /api/x/user/:username
    headers: { "x-username": username },
  });

  return response.json();
}

const user = await getUserProfile("elonmusk");
console.log(user.data.name, user.data.public_metrics.followers_count);
```

### Base (EVM) — Search Recent Tweets

```typescript
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: base, transport: http() });
const fetch = wrapFetchWithPayment(globalThis.fetch, wallet);

const query = encodeURIComponent("AI agents lang:en -is:retweet");
const res = await fetch(`https://metar.api/api/x/search/recent?query=${query}&max_results=10`);
const data = await res.json();

for (const tweet of data.data) {
  console.log(`@${tweet.author_id}: ${tweet.text}`);
}
```

### Ethereum — Get User Timeline

```typescript
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: mainnet, transport: http() });
const fetch = wrapFetchWithPayment(globalThis.fetch, wallet);

// Get @vitalikbuterin's timeline
const res = await fetch("https://metar.api/api/x/user/44196397/tweets?max_results=20");
const timeline = await res.json();

timeline.data.forEach((tweet: any) => {
  console.log(tweet.text, "\n---");
});
```

### Solana Devnet — Testing

```typescript
import { MetarClient, createNodeWallet } from "@metar/metar-client";
import { createConnection } from "@metar/shared-config";
import { Keypair } from "@solana/web3.js";

// Use devnet for testing — free devnet USDC airdrop available
const keypair = Keypair.generate(); // or load from file
const wallet = createNodeWallet(keypair);
const connection = createConnection("devnet");

const client = new MetarClient({
  providerBaseURL: "https://metar.api",
  agentKeyId: `test-agent-${Date.now()}`,
  agentPrivateKey: keypair.secretKey,
  wallet,
  connection,
  chain: "solana-devnet",
});

// Get price before paying
const priceRes = await fetch("https://metar.api/.meter/price?route=tweet:lookup");
const price = await priceRes.json();
console.log(`Tweet lookup costs ${price.price} ${price.currency}`);
```

### Batch Processing — Analyze 100 Tweets

```typescript
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: base, transport: http() });
const fetch = wrapFetchWithPayment(globalThis.fetch, wallet);

const tweetIds = [
  "1234567890", "1234567891", "1234567892",
  // ... up to 100
];

// Single payment covers the batch
const res = await fetch("https://metar.api/api/x/tweets", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ids: tweetIds }),
});

const { data } = await res.json();
console.log(`Fetched ${data.length} tweets for $0.008 USDC`);
```

---

## Troubleshooting

### `402 Payment Required` on every request
- Your wallet has insufficient USDC balance
- Check balance: connect to Solana devnet/mainnet and verify USDC token account
- For devnet testing, use a USDC faucet

### `Payment verification failed`
- Timestamp drift: ensure your system clock is accurate (NTP sync recommended)
- Nonce reuse: nonces must be unique per request (UUID v7 recommended)
- Wrong recipient: payment must go to the address returned by `/.meter/price`

### `TAP signature invalid`
- Ensure `agentPrivateKey` matches the registered `agentKeyId`
- Don't share keypairs across multiple agent instances with different IDs
- Check that the signature covers the correct headers (request-target, date, nonce, tx)

### `Route not found`
- Verify the route ID exactly matches the table above (case-sensitive)
- Check `/api/pricing` for a complete, up-to-date route list

### EVM: `Insufficient funds`
- USDC balance must cover the route price + gas fees on Base/Ethereum
- Use Base for 100x cheaper gas vs Ethereum mainnet

### Connection timeouts
- Check network connectivity to Solana RPC
- Consider using a private RPC (Helius, Triton, Alchemy) for production
- Default public RPC may rate-limit under high load

### Need help?
- Service status: `GET https://metar.api/api/info`
- Full pricing: `GET https://metar.api/api/pricing`
- Trust manifest: `GET https://metar.api/.well-known/trust.json`
