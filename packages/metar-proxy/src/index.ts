/**
 * metar-proxy – x402-gated X (Twitter) API v2 proxy server.
 *
 * Proxies authenticated requests to the real Twitter API v2,
 * protected by x402 USDC payment middleware.
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createConnection, getUSDCMint } from "@metar/shared-config";
import { createX402Middleware, createX402WellKnown } from "@metar/metar-provider";
import type { AgentKeyRegistry } from "@metar/metar-provider";
import { ALL_ROUTES, TIER_PRICES, type RouteDefinition } from "./routes.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT ?? 3001);
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const SOLANA_NETWORK = (process.env.SOLANA_NETWORK as "devnet" | "mainnet") ?? "devnet";
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const FACILITATOR_URL = process.env.FACILITATOR_URL;

if (!WALLET_ADDRESS) {
  console.error("❌  WALLET_ADDRESS is required – set it in .env");
  process.exit(1);
}

const connection = createConnection(SOLANA_NETWORK);
const usdcMint = getUSDCMint(SOLANA_NETWORK);
const usdcMintStr = usdcMint.toBase58();
const chain = SOLANA_NETWORK === "mainnet" ? "solana" : "solana-devnet";

// ---------------------------------------------------------------------------
// Twitter API proxy target
// ---------------------------------------------------------------------------

const TWITTER_API_BASE = "https://api.twitter.com";

// ---------------------------------------------------------------------------
// x402 setup
// ---------------------------------------------------------------------------

// Minimal in-memory registry (accepts all agents) – replace in production.
const agentRegistry: AgentKeyRegistry = {
  lookupAgentKey: async (_keyId: string) => null,
};

// Build routes map: routeId → RoutePricingConfig
const routesMap = new Map(
  ALL_ROUTES.map((r: RouteDefinition) => [
    r.routeId,
    {
      price: TIER_PRICES[r.tier],
      tokenMint: usdcMintStr,
      payTo: WALLET_ADDRESS!,
      chain: chain as "solana" | "solana-devnet",
    },
  ])
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();

app.use(cors());
app.use(express.json());

// ── /.well-known/x402 ──────────────────────────────────────────────────────
app.get(
  "/.well-known/x402",
  createX402WellKnown({
    routes: routesMap,
    connection,
    agentRegistry,
  })
);

// ── /health ────────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "@metar/metar-proxy",
    network: SOLANA_NETWORK,
    wallet: WALLET_ADDRESS,
    ts: new Date().toISOString(),
  });
});

// ── Register all x402-gated proxy routes ───────────────────────────────────
for (const route of ALL_ROUTES) {
  const paymentMiddleware = createX402Middleware({
    routeId: route.routeId,
    price: TIER_PRICES[route.tier],
    tokenMint: usdcMintStr,
    payTo: WALLET_ADDRESS!,
    chain: chain as "solana" | "solana-devnet",
    connection,
    agentRegistry,
    ...(FACILITATOR_URL
      ? { facilitatorMode: true, facilitatorUrl: FACILITATOR_URL }
      : {}),
  });

  const handler = async (req: Request, res: Response) => {
    // Strip the /x/2 prefix and forward to Twitter API v2 /2
    const twitterPath = req.path.replace(/^\/x\/2/, "/2");
    const qs = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";
    const targetUrl = `${TWITTER_API_BASE}${twitterPath}${qs}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (TWITTER_BEARER_TOKEN) {
      headers["Authorization"] = `Bearer ${TWITTER_BEARER_TOKEN}`;
    }

    try {
      const body =
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined;

      const twitterRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
      });

      const responseBody = await twitterRes.text();

      // Forward status and body
      res.status(twitterRes.status);
      twitterRes.headers.forEach((value, key) => {
        if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      res.setHeader("Content-Type", "application/json");
      res.send(responseBody);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: "Upstream Twitter API error", details: message });
    }
  };

  const expressPath = route.pattern;

  switch (route.method) {
    case "GET":
      app.get(expressPath, paymentMiddleware, handler);
      break;
    case "POST":
      app.post(expressPath, paymentMiddleware, handler);
      break;
    case "PUT":
      app.put(expressPath, paymentMiddleware, handler);
      break;
    case "DELETE":
      app.delete(expressPath, paymentMiddleware, handler);
      break;
    case "PATCH":
      app.patch(expressPath, paymentMiddleware, handler);
      break;
  }
}

// ── 404 catch-all ──────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Error handler ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`🌐 metar-proxy listening on port ${PORT}`);
  console.log(`   Network : ${SOLANA_NETWORK}`);
  console.log(`   Wallet  : ${WALLET_ADDRESS}`);
  console.log(`   Routes  : ${ALL_ROUTES.length} x402-gated endpoints`);
  if (FACILITATOR_URL) {
    console.log(`   Facilitator: ${FACILITATOR_URL}`);
  }
});

export { app };
