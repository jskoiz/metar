import { spawn } from "child_process";
import path from "path";

async function verifyFacilitator() {
    console.log("Verifying Facilitator Integration...");

    // Start the facilitator service
    const facilitatorPath = path.resolve(__dirname, "../packages/facilitator/src/index.ts");
    console.log(`Starting facilitator from ${facilitatorPath}...`);

    // We use tsx to run the typescript file directly
    const server = spawn("npx", ["tsx", facilitatorPath], {
        env: { ...process.env, PORT: "3002", SOLANA_NETWORK: "devnet" },
        stdio: "pipe"
    });

    server.stdout.on("data", (data) => {
        console.log(`[Facilitator]: ${data}`);
    });

    server.stderr.on("data", (data) => {
        console.error(`[Facilitator Error]: ${data}`);
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        console.log("Sending verification request...");
        const response = await fetch("http://localhost:3002/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                txSig: "5j7s8K9mN0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8z", // Dummy sig
                routeId: "summarize:v1",
                amount: 0.03,
                payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz", // Dummy address
                tokenMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" // Devnet USDC
            })
        });

        const result = await response.json();
        console.log("Response:", result);

        if (response.ok) {
            // We expect it to fail verification because the tx is fake, but the REQUEST should succeed
            // The facilitator should return { verified: false, error: ... }
            if (result.verified === false && result.error) {
                console.log("✅ Facilitator responded correctly (verified=false for fake tx)");
            } else {
                console.error("❌ Facilitator response unexpected:", result);
                process.exit(1);
            }
        } else {
            console.error("❌ Facilitator request failed:", response.status);
            process.exit(1);
        }

    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    } finally {
        server.kill();
    }
}

verifyFacilitator().catch(console.error);
