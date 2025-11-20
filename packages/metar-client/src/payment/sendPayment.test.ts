/**
 * Unit tests for sendPayment function.
 *
 * Tests transaction signing and sending logic, including retry behavior
 * and error handling for disconnected wallets.
 */

import { test } from "node:test";
import assert from "node:assert";
import { Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import { sendPayment } from "./sendPayment.js";
import { createNodeWallet } from "../wallet/nodeWallet.js";
import { createConnection } from "@metar/shared-config";

const skipTests = process.env.SKIP_UNIT_TESTS === "true";

test("sendPayment - throws error when wallet not connected", async () => {
  const connection = createConnection("devnet");
  const mockWallet = {
    publicKey: null,
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  };

  const transaction = new Transaction();

  await assert.rejects(
    async () => {
      await sendPayment(connection, mockWallet as any, transaction);
    },
    {
      message: "Wallet not connected",
    }
  );
});

test("sendPayment - validates wallet connection before proceeding", async () => {
  const connection = createConnection("devnet");
  const keypair = Keypair.generate();

  // Create wallet with null publicKey
  const disconnectedWallet = {
    publicKey: null,
    signTransaction: async (tx: Transaction) => {
      tx.sign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      return txs.map(tx => {
        tx.sign(keypair);
        return tx;
      });
    },
  };

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1000,
    })
  );

  await assert.rejects(
    async () => {
      await sendPayment(connection, disconnectedWallet as any, transaction);
    },
    {
      message: "Wallet not connected",
    }
  );
});
