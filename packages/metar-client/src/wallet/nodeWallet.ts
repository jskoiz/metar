import { Keypair, Transaction } from "@solana/web3.js";
import { WalletAdapter } from "./types";

/**
 * Creates a wallet adapter from a Solana Keypair for Node.js environments.
 *
 * This adapter is suitable for server-side applications or scripts that use
 * a keypair directly (e.g., loaded from a file or environment variable).
 *
 * @param keypair - The Solana Keypair to use for signing
 * @returns A WalletAdapter instance configured with the provided keypair
 *
 * @example
 * ```typescript
 * import { Keypair } from "@solana/web3.js";
 * import { createNodeWallet } from "@metar/metar-client";
 *
 * const keypair = Keypair.generate();
 * const wallet = createNodeWallet(keypair);
 *
 * const transaction = new Transaction();
 * const signedTx = await wallet.signTransaction(transaction);
 * ```
 *
 * @see {@link file://research/x402-client-sdk-patterns.md | Client SDK Patterns}
 */
export function createNodeWallet(keypair: Keypair): WalletAdapter {
  return {
    publicKey: keypair.publicKey,
    async signTransaction(tx: Transaction): Promise<Transaction> {
      tx.sign(keypair);
      return tx;
    },
    async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
      return txs.map(tx => {
        tx.sign(keypair);
        return tx;
      });
    },
  };
}
