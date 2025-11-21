import { FileAgentRegistry } from "../packages/agent-registry/src/registry";
import { FileNonceStore } from "../packages/metar-provider/src/verification/NonceStore";
import fs from "fs";
import path from "path";

const AGENTS_FILE = "test-agents.json";
const NONCES_FILE = "test-nonces.json";

async function verifyPersistence() {
    console.log("Verifying persistence...");

    // Clean up old files
    if (fs.existsSync(AGENTS_FILE)) fs.unlinkSync(AGENTS_FILE);
    if (fs.existsSync(NONCES_FILE)) fs.unlinkSync(NONCES_FILE);

    // 1. Verify Agent Registry
    console.log("1. Testing Agent Registry Persistence");
    const registry1 = new FileAgentRegistry(AGENTS_FILE);
    registry1.addAgentKey({
        keyId: "agent-1",
        publicKey: "pubkey1",
        algorithm: "ed25519"
    });
    console.log("   Added agent-1 to registry1");

    // Create new instance and check if it loads
    const registry2 = new FileAgentRegistry(AGENTS_FILE);
    const key = await registry2.lookupAgentKey("agent-1");
    if (key && key.publicKey === "pubkey1") {
        console.log("   ✅ Registry persistence verified");
    } else {
        console.error("   ❌ Registry persistence failed");
        process.exit(1);
    }

    // 2. Verify Nonce Store
    console.log("2. Testing Nonce Store Persistence");
    const nonceStore1 = new FileNonceStore(NONCES_FILE);
    await nonceStore1.checkAndConsume("nonce-1", "agent-1");
    console.log("   Consumed nonce-1 in nonceStore1");

    // Create new instance and check if it remembers
    const nonceStore2 = new FileNonceStore(NONCES_FILE);
    const isNew = await nonceStore2.checkAndConsume("nonce-1", "agent-1");
    if (isNew === false) {
        console.log("   ✅ Nonce persistence verified (correctly rejected used nonce)");
    } else {
        console.error("   ❌ Nonce persistence failed (accepted used nonce)");
        process.exit(1);
    }

    // Clean up
    fs.unlinkSync(AGENTS_FILE);
    fs.unlinkSync(NONCES_FILE);
    console.log("Verification complete!");
}

verifyPersistence().catch(console.error);
