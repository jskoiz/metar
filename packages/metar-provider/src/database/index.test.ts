/**
 * Unit tests for database operations.
 *
 * Tests usage logging, transaction duplicate checking, and database schema initialization.
 * Uses an in-memory SQLite database for testing.
 *
 * @see {@link file://hackathon/technical-specifications.md | Technical Specifications}
 */

import { test } from "node:test";
import assert from "node:assert";
import { Database } from "sqlite3";
import { PaymentHeaders } from "@metar/shared-types";
import { initializeDatabase, logUsage, isTransactionUsed } from "./index.js";

// Helper function to create a test database
function createTestDatabase(): Database {
  return new Database(":memory:");
}

// Helper function to create test payment headers
function createTestPaymentHeaders(overrides?: Partial<PaymentHeaders>): PaymentHeaders {
  return {
    txSig: "5j7s8K9abcdef123456789",
    routeId: "summarize:v1",
    amount: 0.03,
    currency: "USDC",
    nonce: "018e1234-5678-9abc-def0-123456789abc",
    timestamp: Date.now(),
    agentKeyId: "agent_12345",
    ...overrides,
  };
}

// Helper function to close database
function closeDatabase(db: Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close(err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

test("initializeDatabase - creates table and indexes", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    // Verify table exists by querying it
    await new Promise<void>((resolve, reject) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='usage_records'",
        (err, row) => {
          if (err) reject(err);
          else {
            assert.ok(row !== undefined, "usage_records table should exist");
            resolve();
          }
        }
      );
    });

    // Verify indexes exist
    await new Promise<void>((resolve, reject) => {
      db.all(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='usage_records'",
        (err, rows) => {
          if (err) reject(err);
          else {
            const indexNames = (rows as Array<{ name: string }>).map(r => r.name);
            assert.ok(indexNames.includes("idx_tx_sig"), "idx_tx_sig index should exist");
            assert.ok(indexNames.includes("idx_route_id"), "idx_route_id index should exist");
            assert.ok(indexNames.includes("idx_payer"), "idx_payer index should exist");
            assert.ok(indexNames.includes("idx_timestamp"), "idx_timestamp index should exist");
            resolve();
          }
        }
      );
    });
  } finally {
    await closeDatabase(db);
  }
});

test("initializeDatabase - can be called multiple times safely", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);
    await initializeDatabase(db); // Should not error

    // Verify table still exists
    await new Promise<void>((resolve, reject) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='usage_records'",
        (err, row) => {
          if (err) reject(err);
          else {
            assert.ok(row !== undefined, "usage_records table should still exist");
            resolve();
          }
        }
      );
    });
  } finally {
    await closeDatabase(db);
  }
});

test("logUsage - inserts usage record successfully", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers = createTestPaymentHeaders();
    const payer = "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz";

    await logUsage(db, headers, payer);

    // Verify record was inserted
    await new Promise<void>((resolve, reject) => {
      db.get("SELECT * FROM usage_records WHERE tx_sig = ?", [headers.txSig], (err, row: any) => {
        if (err) reject(err);
        else {
          assert.ok(row !== undefined, "Record should exist");
          assert.strictEqual(row.route_id, headers.routeId);
          assert.strictEqual(row.tx_sig, headers.txSig);
          assert.strictEqual(row.payer, payer);
          assert.strictEqual(row.amount, headers.amount);
          assert.strictEqual(row.timestamp, headers.timestamp);
          assert.strictEqual(row.nonce, headers.nonce);
          assert.strictEqual(row.status, "consumed");
          assert.strictEqual(row.agent_key_id, headers.agentKeyId);
          resolve();
        }
      });
    });
  } finally {
    await closeDatabase(db);
  }
});

test("logUsage - sets status to consumed", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers = createTestPaymentHeaders();
    const payer = "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz";

    await logUsage(db, headers, payer);

    await new Promise<void>((resolve, reject) => {
      db.get(
        "SELECT status FROM usage_records WHERE tx_sig = ?",
        [headers.txSig],
        (err, row: any) => {
          if (err) reject(err);
          else {
            assert.strictEqual(row.status, "consumed");
            resolve();
          }
        }
      );
    });
  } finally {
    await closeDatabase(db);
  }
});

test("logUsage - handles optional agentKeyId", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers = createTestPaymentHeaders({ agentKeyId: undefined });
    const payer = "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz";

    await logUsage(db, headers, payer);

    await new Promise<void>((resolve, reject) => {
      db.get(
        "SELECT agent_key_id FROM usage_records WHERE tx_sig = ?",
        [headers.txSig],
        (err, row: any) => {
          if (err) reject(err);
          else {
            assert.strictEqual(row.agent_key_id, null);
            resolve();
          }
        }
      );
    });
  } finally {
    await closeDatabase(db);
  }
});

test("logUsage - rejects duplicate transaction signature", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers = createTestPaymentHeaders();
    const payer = "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz";

    await logUsage(db, headers, payer);

    // Try to log the same transaction again
    let error: Error | null = null;
    try {
      await logUsage(db, headers, payer);
    } catch (err) {
      error = err as Error;
    }

    assert.ok(error !== null, "Should reject duplicate transaction");
    assert.ok(
      error!.message.includes(headers.txSig),
      "Error message should include transaction signature"
    );
  } finally {
    await closeDatabase(db);
  }
});

test("logUsage - generates unique ID for each record", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers1 = createTestPaymentHeaders({ txSig: "tx1" });
    const headers2 = createTestPaymentHeaders({ txSig: "tx2" });
    const payer = "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz";

    await logUsage(db, headers1, payer);
    await logUsage(db, headers2, payer);

    await new Promise<void>((resolve, reject) => {
      db.all("SELECT id FROM usage_records", (err, rows: Array<{ id: string }>) => {
        if (err) reject(err);
        else {
          assert.strictEqual(rows.length, 2);
          assert.notStrictEqual(rows[0].id, rows[1].id, "IDs should be unique");
          resolve();
        }
      });
    });
  } finally {
    await closeDatabase(db);
  }
});

test("isTransactionUsed - returns false for unused transaction", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const txSig = "5j7s8K9abcdef123456789";
    const result = await isTransactionUsed(db, txSig);

    assert.strictEqual(result, false);
  } finally {
    await closeDatabase(db);
  }
});

test("isTransactionUsed - returns true for used transaction", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers = createTestPaymentHeaders();
    const payer = "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz";

    await logUsage(db, headers, payer);

    const result = await isTransactionUsed(db, headers.txSig);
    assert.strictEqual(result, true);
  } finally {
    await closeDatabase(db);
  }
});

test("isTransactionUsed - handles different transaction signatures", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers1 = createTestPaymentHeaders({ txSig: "tx1" });
    const headers2 = createTestPaymentHeaders({ txSig: "tx2" });
    const payer = "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz";

    await logUsage(db, headers1, payer);

    const result1 = await isTransactionUsed(db, "tx1");
    const result2 = await isTransactionUsed(db, "tx2");

    assert.strictEqual(result1, true);
    assert.strictEqual(result2, false);
  } finally {
    await closeDatabase(db);
  }
});

test("logUsage and isTransactionUsed - work together correctly", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers = createTestPaymentHeaders();
    const payer = "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz";

    // Initially unused
    assert.strictEqual(await isTransactionUsed(db, headers.txSig), false);

    // Log usage
    await logUsage(db, headers, payer);

    // Now should be used
    assert.strictEqual(await isTransactionUsed(db, headers.txSig), true);
  } finally {
    await closeDatabase(db);
  }
});

test("logUsage - stores all required fields correctly", async () => {
  const db = createTestDatabase();

  try {
    await initializeDatabase(db);

    const headers = createTestPaymentHeaders({
      txSig: "test_tx_123",
      routeId: "test:route",
      amount: 1.5,
      nonce: "test-nonce-123",
      timestamp: 1234567890,
      agentKeyId: "test-agent",
    });
    const payer = "test_payer_address";

    await logUsage(db, headers, payer);

    await new Promise<void>((resolve, reject) => {
      db.get("SELECT * FROM usage_records WHERE tx_sig = ?", [headers.txSig], (err, row: any) => {
        if (err) reject(err);
        else {
          assert.ok(row.id, "ID should be set");
          assert.strictEqual(row.route_id, "test:route");
          assert.strictEqual(row.tx_sig, "test_tx_123");
          assert.strictEqual(row.payer, "test_payer_address");
          assert.strictEqual(row.amount, 1.5);
          assert.strictEqual(row.timestamp, 1234567890);
          assert.strictEqual(row.nonce, "test-nonce-123");
          assert.strictEqual(row.status, "consumed");
          assert.strictEqual(row.agent_key_id, "test-agent");
          resolve();
        }
      });
    });
  } finally {
    await closeDatabase(db);
  }
});
