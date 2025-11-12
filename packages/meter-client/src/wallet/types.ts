import { PublicKey, Transaction } from "@solana/web3.js";

/**
 * Wallet adapter interface for Solana wallet integration.
 * 
 * Provides a unified interface for both Node.js keypair wallets and browser wallet adapters.
 * This allows the meter client to work with different wallet implementations seamlessly.
 * 
 * @see {@link file://research/x402-client-sdk-patterns.md | Client SDK Patterns}
 */
export interface WalletAdapter {
  /** The public key of the wallet, or null if not connected */
  publicKey: PublicKey | null;
  
  /**
   * Signs a single transaction.
   * 
   * @param transaction - The transaction to sign
   * @returns A promise that resolves to the signed transaction
   */
  signTransaction(transaction: Transaction): Promise<Transaction>;
  
  /**
   * Signs multiple transactions.
   * 
   * @param transactions - Array of transactions to sign
   * @returns A promise that resolves to an array of signed transactions
   */
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}

