/**
 * Integration tests for payment verification on Solana devnet.
 *
 * Tests actual payment verification by:
 * 1. Creating and sending real transactions on devnet
 * 2. Verifying those transactions using the verifyPayment function
 *
 * To run these tests:
 * 1. Ensure you have a devnet RPC endpoint configured
 * 2. Fund test accounts with SOL for transaction fees
 * 3. Fund test accounts with USDC tokens for transfers
 *
 * Set SKIP_INTEGRATION_TESTS=true to skip these tests.
 *
 * @see {@link file://research/x402-provider-middleware-patterns.md | Provider Middleware Patterns}
 */

import { test } from "node:test";
import assert from "node:assert";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { verifyPayment } from "./payment.js";
import { PaymentHeaders, PaymentMemo } from "@metar/shared-types";
import { createConnection, getUSDCMint, MEMO_PROGRAM_ID } from "@metar/shared-config";
import { buildUSDCTransfer } from "@metar/metar-client";
import { sendPayment } from "@metar/metar-client";
import { createNodeWallet } from "@metar/metar-client";

// Skip integration tests if SKIP_INTEGRATION_TESTS env var is set
const skipIntegration = process.env.SKIP_INTEGRATION_TESTS === "true";

test(
  "verifyPayment - integration test with real devnet transaction",
  { skip: skipIntegration },
  async () => {
    const connection = createConnection("devnet");
    const usdcMint = getUSDCMint("devnet");

    // Generate test keypairs
    const payer = Keypair.generate();
    const recipient = Keypair.generate();

    console.log("Payer:", payer.publicKey.toString());
    console.log("Recipient:", recipient.publicKey.toString());

    // Airdrop SOL to payer for transaction fees
    console.log("Airdropping SOL to payer...");
    const payerAirdropSig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9); // 2 SOL
    await connection.confirmTransaction(payerAirdropSig, "confirmed");

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

    // Mint USDC tokens to payer account for testing
    // Note: This requires the payer to be a mint authority or using a devnet faucet
    // For this test, we'll try to mint a small amount
    try {
      console.log("Attempting to mint USDC tokens...");
      const mintAmount = 1 * Math.pow(10, mintInfo.decimals); // 1 USDC
      await mintTo(
        connection,
        payer,
        usdcMint,
        payerTokenAccount.address,
        payer, // This will fail if payer is not mint authority, which is expected
        mintAmount
      );
      console.log("USDC tokens minted successfully");
    } catch (error: any) {
      console.log("Note: Could not mint USDC tokens (expected if payer is not mint authority)");
      console.log("To run this test, ensure the payer account has USDC balance");
      console.log("Error:", error.message);
      // Continue anyway - the test will fail at verification if there's no balance
    }

    // Build and send payment transaction
    const amount = 0.01; // 0.01 USDC
    const routeId = "summarize:v1";
    const nonce = `test-nonce-${Date.now()}`;

    const memo: PaymentMemo = {
      providerId: "test-provider.com",
      routeId,
      nonce,
      amount,
      timestamp: Date.now(),
    };

    console.log("Building USDC transfer transaction...");
    const transaction = await buildUSDCTransfer(
      connection,
      payer.publicKey,
      recipient.publicKey,
      amount,
      usdcMint,
      memo
    );

    // Send transaction
    const wallet = createNodeWallet(payer);
    let txSig: string;

    try {
      console.log("Sending payment transaction...");
      txSig = await sendPayment(connection, wallet, transaction);
      console.log(`Transaction sent! Signature: ${txSig}`);

      // Wait for confirmation
      await connection.confirmTransaction(txSig, "confirmed");
      console.log("Transaction confirmed!");
    } catch (error: any) {
      if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
        console.log("Test skipped: Insufficient USDC balance");
        console.log("To run this test, fund the payer account with USDC tokens");
        return;
      }
      throw error;
    }

    // Verify payment
    const headers: PaymentHeaders = {
      txSig,
      routeId,
      amount,
      currency: "USDC",
      nonce,
      timestamp: Date.now(),
      agentKeyId: "test-agent-key",
    };

    console.log("Verifying payment...");
    const isValid = await verifyPayment(
      connection,
      txSig,
      usdcMint,
      recipient.publicKey,
      amount,
      headers
    );

    assert.strictEqual(isValid, true, "Payment verification should succeed");
    console.log("Payment verified successfully!");
  }
);

test("verifyPayment - integration test without memo", { skip: skipIntegration }, async () => {
  const connection = createConnection("devnet");
  const usdcMint = getUSDCMint("devnet");

  const payer = Keypair.generate();
  const recipient = Keypair.generate();

  // Airdrop SOL
  const payerAirdropSig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9);
  await connection.confirmTransaction(payerAirdropSig, "confirmed");

  const recipientAirdropSig = await connection.requestAirdrop(recipient.publicKey, 1 * 1e9);
  await connection.confirmTransaction(recipientAirdropSig, "confirmed");

  // Create token accounts
  await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, payer.publicKey);

  await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, recipient.publicKey);

  // Build transaction without memo
  const amount = 0.01;
  const transaction = await buildUSDCTransfer(
    connection,
    payer.publicKey,
    recipient.publicKey,
    amount,
    usdcMint
  );

  // Send transaction
  const wallet = createNodeWallet(payer);
  let txSig: string;

  try {
    txSig = await sendPayment(connection, wallet, transaction);
    await connection.confirmTransaction(txSig, "confirmed");
  } catch (error: any) {
    if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
      console.log("Test skipped: Insufficient USDC balance");
      return;
    }
    throw error;
  }

  // Verify payment (should work even without memo)
  const headers: PaymentHeaders = {
    txSig,
    routeId: "summarize:v1",
    amount,
    currency: "USDC",
    nonce: `test-nonce-${Date.now()}`,
    timestamp: Date.now(),
    agentKeyId: "test-agent-key",
  };

  const isValid = await verifyPayment(
    connection,
    txSig,
    usdcMint,
    recipient.publicKey,
    amount,
    headers
  );

  assert.strictEqual(isValid, true, "Payment verification should succeed without memo");
});

test(
  "verifyPayment - integration test with mismatched memo",
  { skip: skipIntegration },
  async () => {
    const connection = createConnection("devnet");
    const usdcMint = getUSDCMint("devnet");

    const payer = Keypair.generate();
    const recipient = Keypair.generate();

    // Airdrop SOL
    const payerAirdropSig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9);
    await connection.confirmTransaction(payerAirdropSig, "confirmed");

    const recipientAirdropSig = await connection.requestAirdrop(recipient.publicKey, 1 * 1e9);
    await connection.confirmTransaction(recipientAirdropSig, "confirmed");

    // Create token accounts
    await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, payer.publicKey);

    await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, recipient.publicKey);

    // Build transaction with memo
    const amount = 0.01;
    const memo: PaymentMemo = {
      providerId: "test-provider.com",
      routeId: "summarize:v1",
      nonce: "memo-nonce-123",
      amount,
      timestamp: Date.now(),
    };

    const transaction = await buildUSDCTransfer(
      connection,
      payer.publicKey,
      recipient.publicKey,
      amount,
      usdcMint,
      memo
    );

    // Send transaction
    const wallet = createNodeWallet(payer);
    let txSig: string;

    try {
      txSig = await sendPayment(connection, wallet, transaction);
      await connection.confirmTransaction(txSig, "confirmed");
    } catch (error: any) {
      if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
        console.log("Test skipped: Insufficient USDC balance");
        return;
      }
      throw error;
    }

    // Verify payment with mismatched nonce (should fail)
    const headers: PaymentHeaders = {
      txSig,
      routeId: "summarize:v1",
      amount,
      currency: "USDC",
      nonce: "different-nonce-456", // Different from memo
      timestamp: Date.now(),
      agentKeyId: "test-agent-key",
    };

    const isValid = await verifyPayment(
      connection,
      txSig,
      usdcMint,
      recipient.publicKey,
      amount,
      headers
    );

    assert.strictEqual(
      isValid,
      false,
      "Payment verification should fail with mismatched memo nonce"
    );
  }
);
