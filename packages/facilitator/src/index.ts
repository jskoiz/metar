import express from "express";
import cors from "cors";
import { Connection, PublicKey } from "@solana/web3.js";
import { verifyPayment } from "@metar/metar-provider";
import { createConnection, getUSDCMint } from "@metar/shared-config";
import { PaymentHeaders } from "@metar/shared-types";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Setup Solana connection
const network = (process.env.SOLANA_NETWORK as "devnet" | "mainnet") || "devnet";
const connection = createConnection(network);
const usdcMint = getUSDCMint(network);

// In-memory route registry (in a real app, this would be a database)
// Maps routeId -> { price, payTo }
const routeRegistry = new Map<string, { price: number; payTo: string }>();

// Add some default routes for demo
routeRegistry.set("summarize:v1", {
    price: 0.03,
    payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz", // Replace with real address if needed
});

interface VerifyRequest {
    txSig: string;
    routeId: string;
    amount: number;
}

app.post("/verify", async (req, res) => {
    try {
        const { txSig, routeId, amount } = req.body as VerifyRequest;

        if (!txSig || !routeId || amount === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Lookup route config
        // In a real facilitator, the provider might register this, or we verify against the provider's claimed parameters
        // For now, we'll verify that the payment matches what was claimed in the request
        // But to be secure, we should verify against a known price/payTo.
        // Since this is a generic facilitator, maybe we accept payTo as a param?
        // But the verifyPaymentViaFacilitator in middleware sends { txSig, routeId, amount }.
        // It doesn't send payTo. So the facilitator must know the payTo for the route.

        // For the hackathon demo, we can just accept the payTo from the request if we modify the middleware,
        // OR we can just assume the facilitator knows about the routes.
        // Let's assume the facilitator is "dumb" and just verifies that *some* payment happened to *some* address?
        // No, verifyPayment needs expectedPayTo.

        // Let's check if the middleware sends payTo.
        // verifyPaymentViaFacilitator(facilitatorUrl, txSig, routeId, amount)
        // It does NOT send payTo.

        // So the facilitator MUST know the payTo for the routeId.
        // This implies a registration step.
        // For simplicity, I'll just use a wildcard or accept it in the body if I update the middleware.
        // But I should stick to the existing middleware signature if possible.

        // Wait, if I'm "implementing Corbits", maybe Corbits allows passing the expected recipient?
        // If I can't change the middleware signature easily (it's in a library), I have to work with what I have.
        // The middleware calls:
        /*
        const verified = await verifyPaymentViaFacilitator(
              options.facilitatorUrl,
              paymentHeaders.txSig,
              paymentHeaders.routeId,
              paymentHeaders.amount
            );
        */

        // This seems like a design flaw in the middleware if the facilitator doesn't know the payTo.
        // UNLESS the facilitator is the one *setting* the price and payTo?
        // Or maybe the routeId contains the payTo? No.

        // I will update the middleware to ALSO send `payTo` and `tokenMint` to the facilitator.
        // This makes the facilitator a "stateless verifier" which is much more useful.

        // But first, let's write the server assuming we'll get those params.

        const payTo = req.body.payTo;
        const tokenMint = req.body.tokenMint;

        if (!payTo || !tokenMint) {
            // Fallback for demo: use hardcoded values if route matches
            const route = routeRegistry.get(routeId);
            if (route) {
                // Verify
                const result = await verifyPayment(
                    connection,
                    txSig,
                    usdcMint, // Use default mint
                    new PublicKey(route.payTo),
                    route.price,
                    {
                        txSig,
                        routeId,
                        amount,
                        currency: "USDC",
                        nonce: "facilitator-check", // We don't check nonce here, or do we?
                        timestamp: Date.now(),
                        agentKeyId: "facilitator"
                    } as PaymentHeaders
                );

                return res.json({ verified: result.success, error: result.error });
            }

            return res.status(400).json({ error: "Route not found and payTo/tokenMint not provided" });
        }

        // Stateless verification
        const result = await verifyPayment(
            connection,
            txSig,
            new PublicKey(tokenMint),
            new PublicKey(payTo),
            amount,
            {
                txSig,
                routeId,
                amount,
                currency: "USDC",
                nonce: "facilitator-check",
                timestamp: Date.now(),
                agentKeyId: "facilitator"
            } as PaymentHeaders
        );

        res.json({ verified: result.success, error: result.error });

    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`Facilitator service running on port ${port}`);
});
