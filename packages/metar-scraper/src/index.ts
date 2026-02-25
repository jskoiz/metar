/**
 * metar-scraper – x402-gated HTTP API for x-follow-grabber scraping capabilities.
 *
 * Exposes premium scraping endpoints, each protected by x402 USDC payment middleware.
 * Calls x-follow-grabber scripts/services as child processes.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { Connection } from "@solana/web3.js";
import { createConnection, getUSDCMint } from "@metar/shared-config";
import { createX402Middleware, createX402WellKnown } from "@metar/metar-provider";
import { AgentKeyRegistry } from "@metar/metar-provider";
import { PRICING, type RouteId } from "./pricing.js";
import { followersRouter } from "./routes/followers.js";
import { mentionsRouter } from "./routes/mentions.js";
import { commentsRouter } from "./routes/comments.js";
import { walletsRouter } from "./routes/wallets.js";
import { statusRouter } from "./routes/status.js";
import { pricingRouter } from "./routes/pricing.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT ?? 3003);
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const NETWORK = (process.env.SOLANA_NETWORK as "devnet" | "mainnet") ?? "devnet";
const FACILITATOR_URL = process.env.FACILITATOR_URL;

if (!WALLET_ADDRESS) {
  console.error("❌  WALLET_ADDRESS is required – set it in .env");
  process.exit(1);
}

const connection: Connection = createConnection(NETWORK);
const usdcMint = getUSDCMint(NETWORK);
const usdcMintStr = usdcMint.toBase58();
const chain = NETWORK === "mainnet" ? "solana" : "solana-devnet";

// ---------------------------------------------------------------------------
// x402 middleware factory (one per route to keep pricing clean)
// ---------------------------------------------------------------------------

// A minimal in-memory AgentKeyRegistry (accepts all agents for now – replace
// with a real registry in production).
const agentRegistry: AgentKeyRegistry = {
  lookupAgentKey: async (_keyId: string) => null,
};

function makePaymentMiddleware(routeId: RouteId) {
  const cfg = PRICING[routeId];
  return createX402Middleware({
    routeId,
    price: cfg.price,
    tokenMint: usdcMintStr,
    payTo: WALLET_ADDRESS!,
    chain,
    connection,
    agentRegistry,
    ...(FACILITATOR_URL
      ? { facilitatorMode: true, facilitatorUrl: FACILITATOR_URL }
      : {}),
  });
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();

app.use(cors());
app.use(express.json());

// /.well-known/x402 – advertise all routes and their pricing
app.get(
  "/.well-known/x402",
  createX402WellKnown({
    routes: Object.fromEntries(
      Object.entries(PRICING).map(([id, cfg]) => [
        id,
        {
          price: cfg.price,
          tokenMint: usdcMintStr,
          payTo: WALLET_ADDRESS!,
          chain,
        },
      ])
    ),
    connection,
    agentRegistry,
  })
);

// Pricing discovery – free endpoint
app.use("/x/scrape/pricing", pricingRouter);

// Payment-gated endpoints
app.use(
  "/x/scrape/status",
  makePaymentMiddleware("x/scrape/status"),
  statusRouter
);

app.use(
  "/x/scrape/mentions",
  makePaymentMiddleware("x/scrape/mentions"),
  mentionsRouter
);

app.use(
  "/x/scrape/followers",
  makePaymentMiddleware("x/scrape/followers/:username"),
  followersRouter
);

app.use(
  "/x/scrape/comments",
  makePaymentMiddleware("x/scrape/comments/:tweetId"),
  commentsRouter
);

app.use(
  "/x/scrape/wallets",
  makePaymentMiddleware("x/scrape/wallets/:username"),
  walletsRouter
);

// Health check – always free
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "@metar/metar-scraper", ts: new Date().toISOString() });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`🦞 metar-scraper listening on port ${PORT}`);
  console.log(`   Network : ${NETWORK}`);
  console.log(`   Pay to  : ${WALLET_ADDRESS}`);
  if (FACILITATOR_URL) {
    console.log(`   Facilitator: ${FACILITATOR_URL}`);
  }
});

export { app };
