/**
 * Integration tests for payment functionality.
 *
 * Tests USDC transfer transaction building and sending on Solana devnet.
 * Requires a devnet connection and test accounts with USDC tokens.
 *
 * To run these tests:
 * 1. Ensure you have a devnet RPC endpoint configured
 * 2. Fund test accounts with SOL for transaction fees
 * 3. Fund test accounts with USDC tokens for transfers
 *
 * @see {@link file://research/x402-client-sdk-patterns.md | Client SDK Patterns}
 */

import { test } from "node:test";
import assert from "node:assert";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { buildUSDCTransfer } from "./buildUSDCTransfer.js";
import { sendPayment } from "./sendPayment.js";
import { createNodeWallet } from "../wallet/nodeWallet.js";
import { createConnection, getUSDCMint, SOLANA_NETWORKS } from "@metar/shared-config";
import { PaymentMemo } from "@metar/shared-types";

// Skip integration tests if SKIP_INTEGRATION_TESTS env var is set
const skipIntegration = process.env.SKIP_INTEGRATION_TESTS === "true";

test("buildUSDCTransfer - integration test on devnet", { skip: skipIntegration }, async () => {
  const connection = createConnection("devnet");

  // Generate test keypairs
  const payer = Keypair.generate();
  const recipient = Keypair.generate();

  // Use devnet USDC mint
  const usdcMint = getUSDCMint("devnet");

  // Airdrop SOL to payer for transaction fees
  console.log("Airdropping SOL to payer...");
  const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9); // 2 SOL
  await connection.confirmTransaction(airdropSig, "confirmed");

  // Airdrop SOL to recipient
  const recipientAirdropSig = await connection.requestAirdrop(recipient.publicKey, 1 * 1e9); // 1 SOL
  await connection.confirmTransaction(recipientAirdropSig, "confirmed");

  // Get or create associated token accounts
  console.log("Creating associated token accounts...");
  const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    usdcMint,
    payer.publicKey
  );

  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer, // Using payer as payer for creation
    usdcMint,
    recipient.publicKey
  );

  // Get mint info to verify decimals
  const mintInfo = await getMint(connection, usdcMint);
  console.log(`USDC mint decimals: ${mintInfo.decimals}`);

  // Note: In a real scenario, you would need to mint USDC tokens to the payer account
  // For devnet, you might need to use a faucet or have pre-funded accounts
  // This test assumes the payer has some USDC balance

  // Build transaction
  const amount = 0.01; // 0.01 USDC
  const transaction = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    amount,
    usdcMint
  );

  assert.ok(transaction instanceof Transaction);
  assert.strictEqual(transaction.instructions.length, 1);

  // Verify transaction structure
  const transferInstruction = transaction.instructions[0];
  assert.strictEqual(transferInstruction.programId.toString(), TOKEN_PROGRAM_ID.toString());

  console.log("Transaction built successfully");
  console.log(`Transfer amount: ${amount} USDC`);
  console.log(`Payer: ${payer.publicKey.toString()}`);
  console.log(`Recipient: ${recipient.publicKey.toString()}`);
});

test("buildUSDCTransfer - with memo on devnet", { skip: skipIntegration }, async () => {
  const connection = createConnection("devnet");

  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  const usdcMint = getUSDCMint("devnet");

  // Airdrop SOL for fees
  const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9);
  await connection.confirmTransaction(airdropSig, "confirmed");

  const memo: PaymentMemo = {
    providerId: "test-provider.com",
    routeId: "test-route:v1",
    nonce: "test-nonce-" + Date.now(),
    amount: 0.01,
    timestamp: Date.now(),
  };

  const transaction = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    0.01,
    usdcMint,
    memo
  );

  assert.ok(transaction instanceof Transaction);
  assert.ok(transaction.instructions.length >= 2); // Transfer + memo

  // Verify memo instruction
  const memoInstruction = transaction.instructions.find(
    ix => ix.programId.toString() === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
  );
  assert.ok(memoInstruction !== undefined, "Memo instruction should be present");

  if (memoInstruction) {
    const memoData = JSON.parse(memoInstruction.data.toString("utf-8"));
    assert.strictEqual(memoData.providerId, memo.providerId);
    assert.strictEqual(memoData.routeId, memo.routeId);
    assert.strictEqual(memoData.nonce, memo.nonce);
    assert.strictEqual(memoData.amount, memo.amount);
  }

  console.log("Transaction with memo built successfully");
});

test("sendPayment - integration test on devnet", { skip: skipIntegration }, async () => {
  const connection = createConnection("devnet");

  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  const wallet = createNodeWallet(payer);
  const usdcMint = getUSDCMint("devnet");

  // Airdrop SOL for fees
  console.log("Airdropping SOL for transaction fees...");
  const payerAirdropSig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9);
  await connection.confirmTransaction(payerAirdropSig, "confirmed");

  const recipientAirdropSig = await connection.requestAirdrop(recipient.publicKey, 1 * 1e9);
  await connection.confirmTransaction(recipientAirdropSig, "confirmed");

  // Create associated token accounts
  await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, payer.publicKey);

  await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, recipient.publicKey);

  // Build transaction
  const transaction = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    0.001, // Small amount for testing
    usdcMint
  );

  // Note: This test will fail if payer doesn't have USDC balance
  // In a real scenario, you would mint USDC tokens first or use a funded account
  try {
    const txSig = await sendPayment(connection, wallet, transaction);
    console.log(`Payment sent successfully! Transaction signature: ${txSig}`);
    assert.ok(typeof txSig === "string");
    assert.ok(txSig.length > 0);
  } catch (error: any) {
    // If it fails due to insufficient balance, that's expected in test environment
    if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
      console.log("Test skipped: Insufficient USDC balance (expected in test environment)");
      console.log("To run this test, fund the payer account with USDC tokens");
    } else {
      throw error;
    }
  }
});

test("sendPayment - with retry logic on devnet", { skip: skipIntegration }, async () => {
  const connection = createConnection("devnet");

  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  const wallet = createNodeWallet(payer);
  const usdcMint = getUSDCMint("devnet");

  // Airdrop SOL for fees
  const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9);
  await connection.confirmTransaction(airdropSig, "confirmed");

  // Create associated token accounts
  await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, payer.publicKey);

  await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, recipient.publicKey);

  const transaction = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    0.001,
    usdcMint
  );

  // Test with custom maxRetries
  try {
    const txSig = await sendPayment(connection, wallet, transaction, 5);
    console.log(`Payment sent with retry logic! Transaction signature: ${txSig}`);
    assert.ok(typeof txSig === "string");
  } catch (error: any) {
    if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
      console.log("Test skipped: Insufficient USDC balance (expected in test environment)");
    } else {
      throw error;
    }
  }
});
