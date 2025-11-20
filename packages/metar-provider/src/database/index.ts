/**
 * Database operations for usage logging and transaction tracking.
 *
 * Provides functions to log payment usage and check for duplicate transactions
 * to prevent replay attacks. Uses SQLite for persistent storage.
 *
 * @see {@link file://hackathon/technical-specifications.md | Technical Specifications}
 */

import { Database } from "sqlite3";
import { PaymentHeaders } from "@metar/shared-types";
import { randomUUID } from "crypto";

/**
 * Initialize the database schema.
 *
 * Creates the usage_records table and required indexes if they don't exist.
 * Should be called once when setting up the database.
 *
 * @param db - SQLite database instance
 * @returns Promise that resolves when schema is initialized
 *
 * @example
 * ```typescript
 * import { Database } from "sqlite3";
 * import { initializeDatabase } from "@metar/metar-provider";
 *
 * const db = new Database("usage.db");
 * await initializeDatabase(db);
 * ```
 */
export function initializeDatabase(db: Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS usage_records (
          id TEXT PRIMARY KEY,
          route_id TEXT NOT NULL,
          tx_sig TEXT UNIQUE NOT NULL,
          payer TEXT NOT NULL,
          amount REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          nonce TEXT NOT NULL,
          status TEXT NOT NULL,
          req_hash TEXT,
          agent_key_id TEXT
        )`,
        err => {
          if (err) {
            reject(err);
            return;
          }
        }
      );

      db.run(`CREATE INDEX IF NOT EXISTS idx_tx_sig ON usage_records(tx_sig)`, err => {
        if (err) {
          reject(err);
          return;
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_route_id ON usage_records(route_id)`, err => {
        if (err) {
          reject(err);
          return;
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_payer ON usage_records(payer)`, err => {
        if (err) {
          reject(err);
          return;
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON usage_records(timestamp)`, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}

/**
 * Logs a usage record for a successful payment.
 *
 * Inserts a new usage record with status "consumed" into the database.
 * The transaction signature must be unique to prevent replay attacks.
 *
 * @param db - SQLite database instance
 * @param headers - Payment headers from the request
 * @param payer - Payer wallet address
 * @returns Promise that resolves when usage is logged, or rejects if txSig already exists
 *
 * @example
 * ```typescript
 * import { Database } from "sqlite3";
 * import { logUsage } from "@metar/metar-provider";
 * import { PaymentHeaders } from "@metar/shared-types";
 *
 * const db = new Database("usage.db");
 * const headers: PaymentHeaders = {
 *   txSig: "5j7s8K9...",
 *   routeId: "summarize:v1",
 *   amount: 0.03,
 *   currency: "USDC",
 *   nonce: "018e1234-5678-9abc-def0-123456789abc",
 *   timestamp: Date.now(),
 *   agentKeyId: "agent_12345"
 * };
 *
 * await logUsage(db, headers, "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz");
 * ```
 */
export function logUsage(db: Database, headers: PaymentHeaders, payer: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const status = "consumed";

    db.run(
      `INSERT INTO usage_records (
        id, route_id, tx_sig, payer, amount, timestamp, nonce, status, req_hash, agent_key_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        headers.routeId,
        headers.txSig,
        payer,
        headers.amount,
        headers.timestamp,
        headers.nonce,
        status,
        null, // req_hash - optional, not provided in PaymentHeaders
        headers.agentKeyId || null,
      ],
      function (err) {
        if (err) {
          // Check if it's a unique constraint violation (duplicate txSig)
          if (
            err.message.includes("UNIQUE constraint failed") ||
            err.message.includes("UNIQUE constraint")
          ) {
            reject(new Error(`Transaction signature ${headers.txSig} already exists`));
          } else {
            reject(err);
          }
          return;
        }
        resolve();
      }
    );
  });
}

/**
 * Checks if a transaction signature has already been used.
 *
 * Queries the database to determine if a transaction signature exists,
 * which indicates the transaction has already been consumed and prevents replay attacks.
 *
 * @param db - SQLite database instance
 * @param txSig - Transaction signature to check
 * @returns Promise that resolves to true if transaction exists, false otherwise
 *
 * @example
 * ```typescript
 * import { Database } from "sqlite3";
 * import { isTransactionUsed } from "@metar/metar-provider";
 *
 * const db = new Database("usage.db");
 * const alreadyUsed = await isTransactionUsed(db, "5j7s8K9...");
 * if (alreadyUsed) {
 *   console.log("Transaction already consumed");
 * }
 * ```
 */
export function isTransactionUsed(db: Database, txSig: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(`SELECT 1 FROM usage_records WHERE tx_sig = ? LIMIT 1`, [txSig], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row !== undefined);
    });
  });
}
