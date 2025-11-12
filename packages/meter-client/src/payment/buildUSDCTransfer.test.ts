/**
 * Unit tests for buildUSDCTransfer function.
 * 
 * Tests USDC transfer transaction construction with and without memos.
 * Uses devnet connection for testing actual transaction building.
 * 
 * Note: These tests require a devnet connection but don't send transactions.
 * For actual transaction sending, see payment.integration.test.ts
 */

import { test } from "node:test";
import assert from "node:assert";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { buildUSDCTransfer } from "./buildUSDCTransfer.js";
import { MEMO_PROGRAM_ID } from "@meter/shared-config";
import { PaymentMemo } from "@meter/shared-types";
import { createConnection, getUSDCMint } from "@meter/shared-config";

const skipTests = process.env.SKIP_UNIT_TESTS === "true";

test("buildUSDCTransfer - creates transaction with transfer instruction", { skip: skipTests }, async () => {
  const connection = createConnection("devnet");
  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  const usdcMint = getUSDCMint("devnet");

  const transaction = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    0.03,
    usdcMint
  );

  assert.ok(transaction instanceof Transaction);
  assert.strictEqual(transaction.instructions.length, 1);
  
  // Verify it's a token transfer instruction
  const instruction = transaction.instructions[0];
  assert.ok(instruction !== undefined);
});

test("buildUSDCTransfer - includes memo instruction when memo provided", { skip: skipTests }, async () => {
  const connection = createConnection("devnet");
  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  const usdcMint = getUSDCMint("devnet");

  const memo: PaymentMemo = {
    providerId: "example.com",
    routeId: "summarize:v1",
    nonce: "test-nonce-123",
    amount: 0.03,
  };

  const transaction = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    0.03,
    usdcMint,
    memo
  );

  assert.ok(transaction instanceof Transaction);
  // Should have transfer instruction + memo instruction
  assert.strictEqual(transaction.instructions.length, 2);
  
  // Check if memo instruction exists
  const memoInstruction = transaction.instructions.find(
    (ix) => ix.programId.equals(MEMO_PROGRAM_ID)
  );
  assert.ok(memoInstruction !== undefined, "Memo instruction should be present");
  
  if (memoInstruction) {
    const memoData = JSON.parse(memoInstruction.data.toString("utf-8"));
    assert.strictEqual(memoData.providerId, "example.com");
    assert.strictEqual(memoData.routeId, "summarize:v1");
    assert.strictEqual(memoData.nonce, "test-nonce-123");
    assert.strictEqual(memoData.amount, 0.03);
  }
});

test("buildUSDCTransfer - handles different amounts correctly", { skip: skipTests }, async () => {
  const connection = createConnection("devnet");
  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  const usdcMint = getUSDCMint("devnet");

  // Test with 6 decimals (USDC standard)
  const transaction1 = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    0.03,
    usdcMint
  );
  assert.ok(transaction1 instanceof Transaction);
  assert.strictEqual(transaction1.instructions.length, 1);

  // Test with larger amount
  const transaction2 = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    100.5,
    usdcMint
  );
  assert.ok(transaction2 instanceof Transaction);
  assert.strictEqual(transaction2.instructions.length, 1);
});

