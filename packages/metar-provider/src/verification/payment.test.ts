/**
 * Unit tests for payment verification functions.
 *
 * Tests verification of Solana payment transactions including token transfers,
 * amounts, and memos. Uses mocked transaction data.
 */

import { test } from "node:test";
import assert from "node:assert";
import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { verifyPayment } from "./payment.js";
import { PaymentHeaders } from "@metar/shared-types";
import { getUSDCMint } from "@metar/shared-config";

// Mock transaction data helpers
function createMockTransaction(
  transferAmount: number,
  destination: PublicKey,
  mint: PublicKey,
  payer: PublicKey,
  memo?: string
): ParsedTransactionWithMeta {
  const recipientATA = new PublicKey("11111111111111111111111111111111"); // Mock ATA

  return {
    meta: {
      err: null,
      fee: 5000,
      innerInstructions: [],
      logMessages: [],
      postBalances: [],
      postTokenBalances: [],
      preBalances: [],
      preTokenBalances: [],
    },
    transaction: {
      message: {
        accountKeys: [],
        instructions: [
          {
            parsed: {
              type: "transfer",
              info: {
                authority: payer.toString(),
                destination: destination.toString(),
                mint: mint.toString(),
                amount: transferAmount.toString(),
              },
            },
            program: "spl-token",
            programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          },
          ...(memo
            ? [
                {
                  programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
                  data: Buffer.from(memo, "utf-8").toString("base64"),
                },
              ]
            : []),
        ],
        recentBlockhash: "test-blockhash",
      },
      signatures: [],
    },
    slot: 12345,
    blockTime: Date.now() / 1000,
  } as any;
}

// Mock Connection
class MockConnection extends Connection {
  private mockTx: ParsedTransactionWithMeta | null = null;

  setMockTransaction(tx: ParsedTransactionWithMeta | null) {
    this.mockTx = tx;
  }

  async getTransaction(
    signature: string,
    options?: any
  ): Promise<ParsedTransactionWithMeta | null> {
    return this.mockTx;
  }
}

test("verifyPayment - verifies valid payment without memo", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const expectedAmount = 0.03;
  const transferAmount = Math.floor(expectedAmount * Math.pow(10, 6)); // 30000

  // Create mock transaction with correct transfer
  const mockTx = createMockTransaction(transferAmount, payTo, usdcMint, payer);

  // Mock the ATA calculation - we need to adjust the mock to use the actual ATA
  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const recipientATA = getAssociatedTokenAddressSync(usdcMint, payTo);

  // Update mock transaction to use actual ATA
  (mockTx.transaction.message.instructions[0] as any).parsed.info.destination =
    recipientATA.toString();

  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1",
    amount: expectedAmount,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(
    connection,
    "test-tx-sig",
    usdcMint,
    payTo,
    expectedAmount,
    headers
  );

  assert.strictEqual(result, true);
});

test("verifyPayment - verifies valid payment with matching memo", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const expectedAmount = 0.03;
  const transferAmount = Math.floor(expectedAmount * Math.pow(10, 6));

  const memo = JSON.stringify({
    routeId: "summarize:v1",
    nonce: "test-nonce-123",
    providerId: "test-provider.com",
    amount: expectedAmount,
  });

  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const recipientATA = getAssociatedTokenAddressSync(usdcMint, payTo);

  const mockTx = createMockTransaction(transferAmount, recipientATA, usdcMint, payer, memo);
  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1",
    amount: expectedAmount,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(
    connection,
    "test-tx-sig",
    usdcMint,
    payTo,
    expectedAmount,
    headers
  );

  assert.strictEqual(result, true);
});

test("verifyPayment - returns false when transaction not found", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  connection.setMockTransaction(null);

  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");

  const headers: PaymentHeaders = {
    txSig: "non-existent-tx",
    routeId: "summarize:v1",
    amount: 0.03,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(connection, "non-existent-tx", usdcMint, payTo, 0.03, headers);

  assert.strictEqual(result, false);
});

test("verifyPayment - returns false when transaction has error", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const mockTx = createMockTransaction(30000, payTo, usdcMint, payer);
  mockTx.meta!.err = { InstructionError: [0, "Custom"] };
  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1",
    amount: 0.03,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(connection, "test-tx-sig", usdcMint, payTo, 0.03, headers);

  assert.strictEqual(result, false);
});

test("verifyPayment - returns false when amount is insufficient", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const expectedAmount = 0.03;
  const insufficientAmount = Math.floor(0.02 * Math.pow(10, 6)); // Less than expected

  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const recipientATA = getAssociatedTokenAddressSync(usdcMint, payTo);

  const mockTx = createMockTransaction(insufficientAmount, recipientATA, usdcMint, payer);
  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1",
    amount: expectedAmount,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(
    connection,
    "test-tx-sig",
    usdcMint,
    payTo,
    expectedAmount,
    headers
  );

  assert.strictEqual(result, false);
});

test("verifyPayment - returns false when memo routeId doesn't match", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const expectedAmount = 0.03;
  const transferAmount = Math.floor(expectedAmount * Math.pow(10, 6));

  const memo = JSON.stringify({
    routeId: "different-route:v1", // Different routeId
    nonce: "test-nonce-123",
    providerId: "test-provider.com",
    amount: expectedAmount,
  });

  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const recipientATA = getAssociatedTokenAddressSync(usdcMint, payTo);

  const mockTx = createMockTransaction(transferAmount, recipientATA, usdcMint, payer, memo);
  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1", // Different from memo
    amount: expectedAmount,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(
    connection,
    "test-tx-sig",
    usdcMint,
    payTo,
    expectedAmount,
    headers
  );

  assert.strictEqual(result, false);
});

test("verifyPayment - returns false when memo nonce doesn't match", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const expectedAmount = 0.03;
  const transferAmount = Math.floor(expectedAmount * Math.pow(10, 6));

  const memo = JSON.stringify({
    routeId: "summarize:v1",
    nonce: "different-nonce", // Different nonce
    providerId: "test-provider.com",
    amount: expectedAmount,
  });

  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const recipientATA = getAssociatedTokenAddressSync(usdcMint, payTo);

  const mockTx = createMockTransaction(transferAmount, recipientATA, usdcMint, payer, memo);
  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1",
    amount: expectedAmount,
    currency: "USDC",
    nonce: "test-nonce-123", // Different from memo
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(
    connection,
    "test-tx-sig",
    usdcMint,
    payTo,
    expectedAmount,
    headers
  );

  assert.strictEqual(result, false);
});

test("verifyPayment - handles invalid memo JSON gracefully", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const expectedAmount = 0.03;
  const transferAmount = Math.floor(expectedAmount * Math.pow(10, 6));

  const invalidMemo = "not-valid-json";

  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const recipientATA = getAssociatedTokenAddressSync(usdcMint, payTo);

  const mockTx = createMockTransaction(transferAmount, recipientATA, usdcMint, payer, invalidMemo);
  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1",
    amount: expectedAmount,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  // Should return false when memo JSON parsing fails
  const result = await verifyPayment(
    connection,
    "test-tx-sig",
    usdcMint,
    payTo,
    expectedAmount,
    headers
  );

  assert.strictEqual(result, false);
});

test("verifyPayment - verifies payment with exact amount", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const expectedAmount = 0.03;
  const transferAmount = Math.floor(expectedAmount * Math.pow(10, 6)); // Exact amount

  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const recipientATA = getAssociatedTokenAddressSync(usdcMint, payTo);

  const mockTx = createMockTransaction(transferAmount, recipientATA, usdcMint, payer);
  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1",
    amount: expectedAmount,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(
    connection,
    "test-tx-sig",
    usdcMint,
    payTo,
    expectedAmount,
    headers
  );

  assert.strictEqual(result, true);
});

test("verifyPayment - verifies payment with amount greater than expected", async () => {
  const connection = new MockConnection("https://api.devnet.solana.com");
  const usdcMint = getUSDCMint("devnet");
  const payTo = new PublicKey("11111111111111111111111111111112");
  const payer = new PublicKey("11111111111111111111111111111113");

  const expectedAmount = 0.03;
  const transferAmount = Math.floor(0.05 * Math.pow(10, 6)); // More than expected

  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const recipientATA = getAssociatedTokenAddressSync(usdcMint, payTo);

  const mockTx = createMockTransaction(transferAmount, recipientATA, usdcMint, payer);
  connection.setMockTransaction(mockTx);

  const headers: PaymentHeaders = {
    txSig: "test-tx-sig",
    routeId: "summarize:v1",
    amount: expectedAmount,
    currency: "USDC",
    nonce: "test-nonce-123",
    timestamp: Date.now(),
    agentKeyId: "agent_123",
  };

  const result = await verifyPayment(
    connection,
    "test-tx-sig",
    usdcMint,
    payTo,
    expectedAmount,
    headers
  );

  assert.strictEqual(result, true); // Should accept overpayment
});
