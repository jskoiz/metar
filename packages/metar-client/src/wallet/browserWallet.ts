import { WalletAdapter } from "./types";

/**
 * Browser wallet adapter interface that matches Solana wallet adapter patterns.
 * This is a minimal interface that browser wallet adapters typically implement.
 */
interface BrowserWalletAdapter {
  publicKey: { toBytes(): Uint8Array } | null;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions?(transactions: any[]): Promise<any[]>;
}

/**
 * Creates a wallet adapter from a browser wallet adapter (e.g., Phantom, Solflare).
 *
 * This adapter wraps browser wallet adapters to provide a consistent interface
 * for the meter client. It handles both adapters that support signAllTransactions
 * and those that only support signTransaction.
 *
 * @param adapter - The browser wallet adapter instance (e.g., from @solana/wallet-adapter-phantom)
 * @returns A WalletAdapter instance configured with the provided browser adapter
 *
 * @example
 * ```typescript
 * import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
 * import { createBrowserWallet } from "@metar/metar-client";
 *
 * const phantomAdapter = new PhantomWalletAdapter();
 * await phantomAdapter.connect();
 * const wallet = createBrowserWallet(phantomAdapter);
 *
 * const transaction = new Transaction();
 * const signedTx = await wallet.signTransaction(transaction);
 * ```
 *
 * @see {@link file://research/x402-client-sdk-patterns.md | Client SDK Patterns}
 */
export function createBrowserWallet(adapter: BrowserWalletAdapter): WalletAdapter {
  return {
    publicKey: adapter.publicKey as any,
    signTransaction: adapter.signTransaction.bind(adapter),
    signAllTransactions:
      adapter.signAllTransactions?.bind(adapter) ||
      (async txs => Promise.all(txs.map(tx => adapter.signTransaction(tx)))),
  };
}
