/**
 * Payment verification for x402 protocol.
 *
 * Verifies on-chain Solana transactions to ensure payments were made correctly.
 * Checks transaction signatures, token transfers, amounts, and optional memos.
 *
 * @see {@link file://research/x402-provider-middleware-patterns.md | Provider Middleware Patterns}
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PaymentHeaders } from "@metar/shared-types";

/**
 * Verifies a payment transaction on Solana.
 *
 * Fetches the transaction from the blockchain and verifies:
 * 1. Transaction exists and is confirmed
 * 2. Token transfer to expected recipient
 * 3. Amount matches or exceeds expected amount
 * 4. Optional memo matches routeId and nonce
 *
 * @param connection - Solana connection instance
 * @param txSig - Transaction signature to verify
 * @param expectedMint - Expected token mint address (e.g., USDC mint)
 * @param expectedPayTo - Expected recipient wallet address
 * @param expectedAmount - Expected payment amount in token units (e.g., 0.03 for 0.03 USDC)
 * @param headers - Payment headers containing routeId and nonce for memo verification
 * @returns Promise that resolves to true if payment is valid, false otherwise
 *
 * @example
 * ```typescript
 * import { Connection, PublicKey } from "@solana/web3.js";
 * import { verifyPayment } from "@metar/metar-provider";
 * import { getUSDCMint } from "@metar/shared-config";
 *
 * const connection = new Connection("https://api.devnet.solana.com");
 * const usdcMint = getUSDCMint("devnet");
 * const payTo = new PublicKey("...");
 *
 * const isValid = await verifyPayment(
 *   connection,
 *   "5j7s8K9abcdef123456...",
 *   usdcMint,
 *   payTo,
 *   0.03,
 *   {
 *     txSig: "5j7s8K9abcdef123456...",
 *     routeId: "summarize:v1",
 *     amount: 0.03,
 *     currency: "USDC",
 *     nonce: "018e1234-5678-9abc-def0-123456789abc",
 *     timestamp: 1704110400000,
 *     agentKeyId: "agent_12345"
 *   }
 * );
 * ```
 */
import { PaymentVerificationResult } from "./errors.js";

export async function verifyPayment(
  connection: Connection,
  txSig: string,
  expectedMint: PublicKey,
  expectedPayTo: PublicKey,
  expectedAmount: number,
  headers: PaymentHeaders
): Promise<PaymentVerificationResult> {
  try {
    // Fetch transaction
    const tx = await connection.getParsedTransaction(txSig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || tx.meta.err) {
      return {
        success: false,
        error: {
          type: "TRANSACTION_NOT_FOUND",
          message: "Transaction not found or failed",
        },
      };
    }

    // Find token transfer
    const transfer = findTokenTransfer(tx, expectedMint, expectedPayTo);
    if (!transfer) {
      return {
        success: false,
        error: {
          type: "INVALID_RECIPIENT",
          message: "Token transfer to expected recipient not found",
        },
      };
    }

    // Verify amount (convert expected amount to smallest unit)
    const expectedAmountSmallestUnit = Math.floor(expectedAmount * Math.pow(10, 6)); // USDC has 6 decimals
    if (transfer.amount < expectedAmountSmallestUnit) {
      return {
        success: false,
        error: {
          type: "INSUFFICIENT_AMOUNT",
          message: `Insufficient amount: expected ${expectedAmountSmallestUnit}, got ${transfer.amount}`,
        },
      };
    }

    // Verify memo
    const memo = findMemo(tx);
    if (memo) {
      try {
        const memoData = JSON.parse(memo);
        if (memoData.routeId !== headers.routeId || memoData.nonce !== headers.nonce) {
          return {
            success: false,
            error: {
              type: "INVALID_MEMO",
              message: "Memo data does not match request headers",
            },
          };
        }
      } catch (e) {
        // Ignore JSON parse errors if memo is not JSON
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Payment verification error:", error);
    return {
      success: false,
      error: {
        type: "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : "Unknown error during verification",
        details: error,
      },
    };
  }
}

/**
 * Finds a token transfer instruction in a parsed transaction.
 *
 * Searches through transaction instructions to find a token transfer
 * to the specified recipient's associated token account.
 *
 * @param tx - Parsed transaction with metadata
 * @param mint - Token mint address
 * @param recipient - Recipient wallet address
 * @returns Transfer details (amount and payer) or null if not found
 */
function findTokenTransfer(
  tx: ParsedTransactionWithMeta,
  mint: PublicKey,
  recipient: PublicKey
): { amount: number; payer: PublicKey } | null {
  if (!tx.meta || !tx.transaction.message.instructions) {
    return null;
  }

  const recipientATA = getAssociatedTokenAddressSync(mint, recipient);

  for (const instruction of tx.transaction.message.instructions) {
    if ("parsed" in instruction && instruction.program === "spl-token") {
      const parsed = instruction.parsed;
      if (parsed.type === "transfer") {
        const info = parsed.info;
        const destination = new PublicKey(info.destination);
        if (destination.equals(recipientATA)) {
          return {
            amount: parseInt(info.amount),
            payer: new PublicKey(info.authority),
          };
        }
      }
    }
  }

  return null;
}

/**
 * Finds a memo instruction in a parsed transaction.
 *
 * Searches through transaction instructions to find a memo instruction
 * and extracts its data as a UTF-8 string.
 *
 * @param tx - Parsed transaction with metadata
 * @returns Memo string or null if not found
 */
function findMemo(tx: ParsedTransactionWithMeta): string | null {
  if (!tx.transaction.message.instructions) {
    return null;
  }

  for (const instruction of tx.transaction.message.instructions) {
    if ("programId" in instruction) {
      const programId = instruction.programId.toString();
      if (programId === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr") {
        if ("data" in instruction) {
          return Buffer.from(instruction.data, "base64").toString("utf-8");
        }
      }
    }
  }

  return null;
}
