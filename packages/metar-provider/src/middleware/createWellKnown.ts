import express from "express";
import { MiddlewareOptions, RoutePricingConfig } from "./createX402Middleware.js";

/**
 * Creates an Express handler for the .well-known/x402 endpoint.
 * 
 * Returns a JSON object listing the supported routes and their pricing.
 * This allows agents to programmatically discover the services offered by this provider.
 * 
 * @param options - The middleware options containing route configurations
 * @returns Express request handler
 */
export function createX402WellKnown(options: MiddlewareOptions) {
    return (req: express.Request, res: express.Response) => {
        const routes: Record<string, any> = {};

        // Helper to format route config
        const formatRoute = (id: string, config: RoutePricingConfig) => ({
            id,
            price: config.price,
            currency: "USDC",
            mint: config.tokenMint,
            chain: config.chain,
            payTo: config.payTo
        });

        // 1. Multi-route mode
        if (options.routes) {
            const routesMap = options.routes instanceof Map
                ? options.routes
                : new Map(Object.entries(options.routes));

            for (const [id, config] of routesMap.entries()) {
                routes[id] = formatRoute(id, config);
            }
        }

        // 2. Single route mode
        if (options.routeId && options.price !== undefined && options.tokenMint && options.payTo && options.chain) {
            routes[options.routeId] = formatRoute(options.routeId, {
                price: options.price,
                tokenMint: options.tokenMint,
                payTo: options.payTo,
                chain: options.chain
            });
        }

        res.json({
            version: "1.0.0",
            provider: "Metar SDK",
            routes
        });
    };
}
