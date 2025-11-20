import nacl from "tweetnacl";
import { signRequest, constructSignatureBaseString } from "./packages/metar-client/src/signature/index.js";
import { createAuthorizationHeader } from "./packages/metar-client/src/signature/createAuthHeader.js";
import {
  verifyAgentSignature,
  AgentKeyRegistry,
} from "./packages/metar-provider/src/verification/tap.js";
import { AgentKey } from "./packages/shared-types/src/index.js";

// Mock Request
class MockRequest {
  headers: Record<string, string> = {};
  method: string = "POST";
  path: string = "/api/pay";
  query: any = {};

  constructor(headers: Record<string, string>) {
    this.headers = headers;
  }
}

// Mock Registry
class MockRegistry implements AgentKeyRegistry {
  private keys = new Map<string, AgentKey>();

  addKey(key: AgentKey) {
    this.keys.set(key.keyId, key);
  }

  async lookupAgentKey(keyId: string): Promise<AgentKey | null> {
    return this.keys.get(keyId) || null;
  }
}

async function runTest() {
  console.log("Starting Visa TAP Verification Test...");

  // 1. Setup Keys
  const keyPair = nacl.sign.keyPair();
  const publicKeyBase58 = Buffer.from(keyPair.publicKey).toString("base64"); // Using base64 for simplicity in test
  const keyId = "test-agent-key-1";

  const registry = new MockRegistry();
  registry.addKey({
    keyId,
    publicKey: publicKeyBase58,
    algorithm: "ed25519",
  });

  // 2. Create Request Data
  const nonce = "nonce-" + Date.now();
  const date = new Date().toUTCString();
  const txSig = "mock-tx-signature";

  // 3. Sign Request (Client Side)
  console.log("Signing request...");
  const baseString = constructSignatureBaseString("POST", "/api/pay", date, nonce, txSig);
  const signature = signRequest(keyPair.secretKey, baseString);
  console.log("Generated signature:", signature);

  const authHeader = createAuthorizationHeader(keyId, signature);
  console.log("Auth Header:", authHeader);

  // 4. Verify Request (Server Side)
  console.log("Verifying request...");
  const req = new MockRequest({
    authorization: authHeader,
    "x-meter-nonce": nonce,
    date: date,
    "x-meter-tx": txSig,
  });

  const isValid = await verifyAgentSignature(req as any, keyId, registry);

  if (isValid) {
    console.log("✅ SUCCESS: Signature verified correctly!");
  } else {
    console.error("❌ FAILURE: Signature verification failed.");
    process.exit(1);
  }
}

runTest().catch(console.error);
