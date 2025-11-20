import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, getMint } from "@solana/spl-token";
import { MEMO_PROGRAM_ID } from "@metar/shared-config";
import { PaymentMemo } from "@metar/shared-types";

/**
 * Builds a USDC transfer transaction on Solana.
 *
 * Creates a transaction that transfers USDC tokens from a payer to a recipient.
 * Optionally includes a payment memo with metadata about the payment.
 *
 * @param connection - Solana connection instance
 * @param payer - Public key of the payer (sender)
 * @param recipient - Public key of the recipient
 * @param amount - Amount to transfer in USDC (e.g., 0.03 for 0.03 USDC)
 * @param mint - Public key of the USDC mint address
 * @param memo - Optional payment memo containing payment metadata
 * @returns A promise that resolves to the constructed transaction
 *
 * @example
 * ```typescript
 * import { Connection, PublicKey } from "@solana/web3.js";
 * import { buildUSDCTransfer } from "@metar/meter-client";
 *
 * const connection = new Connection("https://api.devnet.solana.com");
 * const payer = new PublicKey("...");
 * const recipient = new PublicKey("...");
 * const mint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
 *
 * const transaction = await buildUSDCTransfer(
 *   connection,
 *   payer,
 *   recipient,
 *   0.03,
 *   mint,
 *   {
 *     providerId: "example.com",
 *     routeId: "summarize:v1",
 *     nonce: "unique-nonce",
 *     amount: 0.03
 *   }
 * );
 * ```
 *
 * @see {@link file://research/x402-client-sdk-patterns.md | Client SDK Patterns}
 */
export async function buildUSDCTransfer(
  connection: Connection,
  payer: PublicKey,
  recipient: PublicKey,
  amount: number,
  mint: PublicKey,
  memo?: PaymentMemo
): Promise<Transaction> {
  // Get associated token accounts
  const payerTokenAccount = await getAssociatedTokenAddress(mint, payer);
  const recipientTokenAccount = await getAssociatedTokenAddress(mint, recipient);

  // Get mint decimals
  const mintInfo = await getMint(connection, mint);
  const decimals = mintInfo.decimals;

  // Convert amount to smallest unit
  const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

  // Create transfer instruction
  const transferInstruction = createTransferInstruction(
    payerTokenAccount,
    recipientTokenAccount,
    payer,
    amountInSmallestUnit
  );

  // Create transaction
  const transaction = new Transaction().add(transferInstruction);

  // Add memo if provided
  if (memo) {
    const memoJson = JSON.stringify(memo);
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoJson, "utf-8"),
    });
    transaction.add(memoInstruction);
  }

  return transaction;
}
