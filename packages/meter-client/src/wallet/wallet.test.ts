/**
 * Unit tests for wallet adapters.
 * 
 * Tests Node.js wallet (Keypair) and browser wallet adapter implementations.
 * Verifies transaction signing functionality for both single and batch operations.
 */

import { test } from "node:test";
import assert from "node:assert";
import { Keypair, Transaction, PublicKey, SystemProgram } from "@solana/web3.js";
import { createNodeWallet } from "./nodeWallet.js";
import { createBrowserWallet } from "./browserWallet.js";
import type { WalletAdapter } from "./types.js";

// Helper function to set a dummy recentBlockhash for testing
function setRecentBlockhash(tx: Transaction): void {
  // Use a dummy blockhash for testing (32 bytes of zeros)
  tx.recentBlockhash = "11111111111111111111111111111111";
}

test("createNodeWallet - creates adapter with correct publicKey", () => {
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  assert.ok(wallet.publicKey !== null);
  assert.ok(wallet.publicKey.equals(keypair.publicKey));
});

test("createNodeWallet - signs single transaction", async () => {
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1000,
    })
  );
  setRecentBlockhash(transaction);

  // Transaction should not be signed initially
  assert.strictEqual(transaction.signatures.length, 0);

  const signedTx = await wallet.signTransaction(transaction);

  // Transaction should be signed after calling signTransaction
  assert.strictEqual(signedTx.signatures.length, 1);
  assert.ok(signedTx.signatures[0].publicKey.equals(keypair.publicKey));
  assert.ok(signedTx.signatures[0].signature !== null);
});

test("createNodeWallet - signs multiple transactions", async () => {
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);
  const recipient = Keypair.generate().publicKey;

  const transactions = [
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports: 1000,
      })
    ),
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports: 2000,
      })
    ),
  ];
  transactions.forEach(setRecentBlockhash);

  // Transactions should not be signed initially
  assert.strictEqual(transactions[0].signatures.length, 0);
  assert.strictEqual(transactions[1].signatures.length, 0);

  const signedTxs = await wallet.signAllTransactions(transactions);

  // All transactions should be signed
  assert.strictEqual(signedTxs.length, 2);
  assert.strictEqual(signedTxs[0].signatures.length, 1);
  assert.strictEqual(signedTxs[1].signatures.length, 1);
  assert.ok(signedTxs[0].signatures[0].publicKey.equals(keypair.publicKey));
  assert.ok(signedTxs[1].signatures[0].publicKey.equals(keypair.publicKey));
});

test("createBrowserWallet - creates adapter with correct publicKey", () => {
  const mockPublicKey = Keypair.generate().publicKey;
  const mockAdapter = {
    publicKey: mockPublicKey,
    signTransaction: async (tx: Transaction) => {
      return tx;
    },
  };

  const wallet = createBrowserWallet(mockAdapter as any);

  assert.ok(wallet.publicKey !== null);
  assert.ok(wallet.publicKey.equals(mockPublicKey));
});

test("createBrowserWallet - signs single transaction", async () => {
  const keypair = Keypair.generate();
  let signedCount = 0;

  const mockAdapter = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: Transaction) => {
      signedCount++;
      tx.sign(keypair);
      return tx;
    },
  };

  const wallet = createBrowserWallet(mockAdapter as any);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1000,
    })
  );
  setRecentBlockhash(transaction);

  const signedTx = await wallet.signTransaction(transaction);

  assert.strictEqual(signedCount, 1);
  assert.strictEqual(signedTx.signatures.length, 1);
  assert.ok(signedTx.signatures[0].publicKey.equals(keypair.publicKey));
});

test("createBrowserWallet - signs multiple transactions with signAllTransactions", async () => {
  const keypair = Keypair.generate();
  const recipient = Keypair.generate().publicKey;
  let signAllCount = 0;

  const mockAdapter = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: Transaction) => {
      tx.sign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      signAllCount++;
      return Promise.all(txs.map(async (tx) => {
        tx.sign(keypair);
        return tx;
      }));
    },
  };

  const wallet = createBrowserWallet(mockAdapter as any);

  const transactions = [
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports: 1000,
      })
    ),
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports: 2000,
      })
    ),
  ];
  transactions.forEach(setRecentBlockhash);

  const signedTxs = await wallet.signAllTransactions(transactions);

  assert.strictEqual(signAllCount, 1);
  assert.strictEqual(signedTxs.length, 2);
  assert.strictEqual(signedTxs[0].signatures.length, 1);
  assert.strictEqual(signedTxs[1].signatures.length, 1);
});

test("createBrowserWallet - falls back to signTransaction when signAllTransactions not available", async () => {
  const keypair = Keypair.generate();
  const recipient = Keypair.generate().publicKey;
  let signTransactionCount = 0;

  const mockAdapter = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: Transaction) => {
      signTransactionCount++;
      tx.sign(keypair);
      return tx;
    },
    // Note: signAllTransactions is not provided
  };

  const wallet = createBrowserWallet(mockAdapter as any);

  const transactions = [
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports: 1000,
      })
    ),
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports: 2000,
      })
    ),
  ];
  transactions.forEach(setRecentBlockhash);

  const signedTxs = await wallet.signAllTransactions(transactions);

  // Should call signTransaction for each transaction
  assert.strictEqual(signTransactionCount, 2);
  assert.strictEqual(signedTxs.length, 2);
  assert.strictEqual(signedTxs[0].signatures.length, 1);
  assert.strictEqual(signedTxs[1].signatures.length, 1);
});

test("createBrowserWallet - handles null publicKey", () => {
  const mockAdapter = {
    publicKey: null,
    signTransaction: async (tx: Transaction) => tx,
  };

  const wallet = createBrowserWallet(mockAdapter as any);

  assert.strictEqual(wallet.publicKey, null);
});

test("WalletAdapter interface - node wallet implements interface correctly", () => {
  const keypair = Keypair.generate();
  const wallet = createNodeWallet(keypair);

  // Type check: wallet should satisfy WalletAdapter interface
  const adapter: WalletAdapter = wallet;

  assert.ok(adapter.publicKey !== null);
  assert.strictEqual(typeof adapter.signTransaction, "function");
  assert.strictEqual(typeof adapter.signAllTransactions, "function");
});

test("WalletAdapter interface - browser wallet implements interface correctly", () => {
  const mockPublicKey = Keypair.generate().publicKey;
  const mockAdapter = {
    publicKey: mockPublicKey,
    signTransaction: async (tx: Transaction) => tx,
  };

  const wallet = createBrowserWallet(mockAdapter as any);

  // Type check: wallet should satisfy WalletAdapter interface
  const adapter: WalletAdapter = wallet;

  assert.ok(adapter.publicKey !== null);
  assert.strictEqual(typeof adapter.signTransaction, "function");
  assert.strictEqual(typeof adapter.signAllTransactions, "function");
});

