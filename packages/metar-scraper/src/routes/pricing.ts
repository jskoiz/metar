/**
 * GET /x/scrape/pricing
 * Free endpoint – lists all scraper routes and their prices.
 */

import { Router } from "express";
import { PRICING } from "../pricing.js";
import { envelope } from "../helpers.js";

export const pricingRouter = Router();

pricingRouter.get("/", (_req, res) => {
  const routes = Object.entries(PRICING).map(([id, cfg]) => ({
    route: `GET /${id}`,
    price_usdc: cfg.price,
    description: cfg.description,
  }));

  res.json(
    envelope(routes, {
      source: "static",
      note: "Prices in USDC. All routes require x402 payment headers except /x/scrape/pricing.",
    })
  );
});
