/**
 * Express endpoint helper for price lookup.
 * 
 * Provides an Express route handler for the GET /.meter/price endpoint.
 * 
 * @see {@link file://hackathon/technical-specifications.md#price-lookup-endpoint | Technical Specifications: Price Lookup Endpoint}
 */

import { Request, Response } from "express";
import { getPrice } from "./priceService.js";

/**
 * Express route handler for GET /.meter/price endpoint.
 * 
 * Query parameters:
 * - `route` (required): Route identifier
 * 
 * Response: `PriceResponse` or error object
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export function priceEndpoint(req: Request, res: Response): void {
  const routeParam = req.query.route;
  let routeId: string | undefined;
  
  if (Array.isArray(routeParam)) {
    const firstParam = routeParam[0];
    routeId = typeof firstParam === "string" ? firstParam : undefined;
  } else if (typeof routeParam === "string") {
    routeId = routeParam;
  }
  
  if (!routeId || routeId === "") {
    res.status(400).json({ error: "route parameter required" });
    return;
  }

  const price = getPrice(routeId);
  
  if (!price) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  res.json(price);
}

