/**
 * Unit tests for MeterClient.
 * 
 * These tests verify that MeterClient properly initializes, validates configuration,
 * and delegates requests to the underlying paid fetch wrapper.
 */

import { Connection, Keypair, Transaction } from "@solana/web3.js";
import { MeterClient, MeterClientConfig } from "./MeterClient.js";
import { WalletAdapter } from "./wallet/types.js";

// Simple test runner
function test(name: string, fn: () => boolean | Promise<boolean>): Promise<boolean> {
  return Promise.resolve(fn()).then(
    (result) => {
      if (result) {
        console.log(`✓ ${name}`);
        return true;
      } else {
        console.error(`✗ ${name}`);
        return false;
      }
    },
    (error) => {
      console.error(`✗ ${name}: ${error}`);
      return false;
    }
  );
}

// Test helper to create a mock wallet
function createMockWallet(publicKey: Keypair["publicKey"]): WalletAdapter {
  return {
    publicKey,
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  };
}

// Test cases
let passed = 0;
let failed = 0;

async function runTests() {
  const keypair = Keypair.generate();
  const mockWallet = createMockWallet(keypair.publicKey);
  const mockConnection = new Connection("https://api.devnet.solana.com");

  // Test 1: Valid configuration
  const validConfig: MeterClientConfig = {
    providerBaseURL: "https://api.example.com",
    agentKeyId: "agent-123",
    agentPrivateKey: keypair.secretKey,
    wallet: mockWallet,
    connection: mockConnection,
    chain: "solana-devnet",
  };

  if (
    await test("MeterClient - creates instance with valid configuration", () => {
      try {
        const client = new MeterClient(validConfig);
        return client instanceof MeterClient;
      } catch (error) {
        return false;
      }
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Configuration without chain
  if (
    await test("MeterClient - creates instance without chain", () => {
      const configWithoutChain = { ...validConfig };
      delete configWithoutChain.chain;
      try {
        const client = new MeterClient(configWithoutChain);
        return client instanceof MeterClient;
      } catch (error) {
        return false;
      }
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: Missing providerBaseURL
  if (
    await test("MeterClient - throws error if providerBaseURL is missing", () => {
      const invalidConfig = { ...validConfig, providerBaseURL: "" };
      try {
        new MeterClient(invalidConfig);
        return false;
      } catch (error) {
        return error instanceof Error && error.message.includes("Invalid MeterClient configuration");
      }
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 4: Missing agentKeyId
  if (
    await test("MeterClient - throws error if agentKeyId is missing", () => {
      const invalidConfig = { ...validConfig, agentKeyId: "" };
      try {
        new MeterClient(invalidConfig);
        return false;
      } catch (error) {
        return error instanceof Error && error.message.includes("Invalid MeterClient configuration");
      }
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 5: Missing agentPrivateKey (empty array)
  if (
    await test("MeterClient - throws error if agentPrivateKey is empty", () => {
      const invalidConfig = { ...validConfig, agentPrivateKey: new Uint8Array(0) };
      try {
        new MeterClient(invalidConfig);
        return false;
      } catch (error) {
        return error instanceof Error && error.message.includes("Invalid MeterClient configuration");
      }
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 6: Missing wallet
  if (
    await test("MeterClient - throws error if wallet is missing", () => {
      const invalidConfig = { ...validConfig, wallet: null as any };
      try {
        new MeterClient(invalidConfig);
        return false;
      } catch (error) {
        return error instanceof Error && error.message.includes("Invalid MeterClient configuration");
      }
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 7: Missing connection
  if (
    await test("MeterClient - throws error if connection is missing", () => {
      const invalidConfig = { ...validConfig, connection: null as any };
      try {
        new MeterClient(invalidConfig);
        return false;
      } catch (error) {
        return error instanceof Error && error.message.includes("Invalid MeterClient configuration");
      }
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 8: Request method exists and is callable
  if (
    await test("MeterClient - request method exists", () => {
      try {
        const client = new MeterClient(validConfig);
        return typeof client.request === "function";
      } catch (error) {
        return false;
      }
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Summary
  console.log("\n--- Test Summary ---");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error("Test runner error:", error);
    process.exit(1);
  });
}
