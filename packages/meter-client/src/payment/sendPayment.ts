import { Connection, Transaction } from "@solana/web3.js";
import { WalletAdapter } from "../wallet/types";

/**
 * Sends a signed payment transaction to the Solana network.
 * 
 * Signs a transaction using the provided wallet adapter, sends it to the network,
 * and waits for confirmation. Includes retry logic for transient failures.
 * 
 * @param connection - Solana connection instance
 * @param wallet - Wallet adapter for signing the transaction
 * @param transaction - The transaction to sign and send
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns A promise that resolves to the transaction signature
 * @throws Error if wallet is not connected or if all retry attempts fail
 * 
 * @example
 * ```typescript
 * import { Connection } from "@solana/web3.js";
 * import { sendPayment, createNodeWallet } from "@meter/meter-client";
 * import { Keypair } from "@solana/web3.js";
 * 
 * const connection = new Connection("https://api.devnet.solana.com");
 * const keypair = Keypair.generate();
 * const wallet = createNodeWallet(keypair);
 * 
 * const transaction = new Transaction();
 * // ... add instructions to transaction
 * 
 * const txSig = await sendPayment(connection, wallet, transaction);
 * console.log("Transaction signature:", txSig);
 * ```
 * 
 * @see {@link file://research/x402-client-sdk-patterns.md | Client SDK Patterns}
 */
export async function sendPayment(
  connection: Connection,
  wallet: WalletAdapter,
  transaction: Transaction,
  maxRetries: number = 3
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign transaction
  const signedTx = await wallet.signTransaction(transaction);

  // Send with retries
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const txSig = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      // Wait for confirmation
      await connection.confirmTransaction(
        {
          signature: txSig,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      return txSig;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Failed to send payment after retries");
}

