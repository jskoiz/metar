/**
 * Unit tests for dashboard backend API endpoints.
 *
 * Tests the Express API endpoints for usage records and statistics.
 * Uses an in-memory SQLite database for testing.
 *
 * @see {@link file://hackathon/technical-specifications.md | Technical Specifications}
 */

import { test } from "node:test";
import assert from "node:assert";
import { Database } from "sqlite3";
import { randomUUID } from "crypto";
import { app, db, initializeDatabase } from "./server.js";
import { UsageRecord } from "@metar/shared-types";
import { Server } from "http";

// Helper function to create a test usage record
function createTestUsageRecord(overrides?: Partial<UsageRecord>): UsageRecord {
  return {
    id: randomUUID(),
    routeId: "summarize:v1",
    txSig: `tx_${randomUUID()}`,
    payer: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
    amount: 0.03,
    timestamp: Date.now(),
    nonce: randomUUID(),
    status: "consumed",
    agentKeyId: "agent_12345",
    ...overrides,
  };
}

// Helper function to insert a usage record into the database
function insertUsageRecord(db: Database, record: UsageRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO usage_records (
        id, route_id, tx_sig, payer, amount, timestamp, nonce, status, req_hash, agent_key_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.routeId,
        record.txSig,
        record.payer,
        record.amount,
        record.timestamp,
        record.nonce,
        record.status,
        record.reqHash || null,
        record.agentKeyId || null,
      ],
      err => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Helper function to make HTTP requests
async function request(
  method: string,
  path: string,
  options?: { query?: Record<string, string>; body?: any }
): Promise<{ status: number; body: any }> {
  const url = new URL(`http://localhost:${serverPort}${path}`);
  if (options?.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

let server: Server;
let serverPort: number;

// Setup: Initialize database and start server before tests
test.before(async () => {
  // Initialize database
  await initializeDatabase(db);

  serverPort = 3002; // Use different port to avoid conflicts
  return new Promise<void>(resolve => {
    server = app.listen(serverPort, () => {
      resolve();
    });
  });
});

// Teardown: Close server after tests
test.after(async () => {
  return new Promise<void>(resolve => {
    server.close(() => {
      db.close(() => resolve());
    });
  });
});

// Cleanup: Clear database before each test
test.beforeEach(async () => {
  return new Promise<void>((resolve, reject) => {
    db.run("DELETE FROM usage_records", err => {
      if (err) reject(err);
      else resolve();
    });
  });
});

test("GET /health - returns health status", async () => {
  const response = await request("GET", "/health");
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.status, "ok");
  assert.strictEqual(response.body.service, "dashboard-backend");
});

test("GET /api/usage - returns empty array when no records", async () => {
  const response = await request("GET", "/api/usage");
  assert.strictEqual(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.strictEqual(response.body.data.length, 0);
  assert.strictEqual(response.body.pagination.total, 0);
});

test("GET /api/usage - returns usage records", async () => {
  const record1 = createTestUsageRecord({
    routeId: "summarize:v1",
    amount: 0.03,
    timestamp: Date.now() - 1000,
  });
  const record2 = createTestUsageRecord({
    routeId: "translate:v1",
    amount: 0.05,
    timestamp: Date.now(),
  });

  await insertUsageRecord(db, record1);
  await insertUsageRecord(db, record2);

  const response = await request("GET", "/api/usage");
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.length, 2);
  assert.strictEqual(response.body.pagination.total, 2);

  // Should be ordered by timestamp DESC (newest first)
  assert.strictEqual(response.body.data[0].id, record2.id);
  assert.strictEqual(response.body.data[1].id, record1.id);
});

test("GET /api/usage - filters by routeId", async () => {
  const record1 = createTestUsageRecord({ routeId: "summarize:v1" });
  const record2 = createTestUsageRecord({ routeId: "translate:v1" });

  await insertUsageRecord(db, record1);
  await insertUsageRecord(db, record2);

  const response = await request("GET", "/api/usage", {
    query: { routeId: "summarize:v1" },
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.length, 1);
  assert.strictEqual(response.body.data[0].routeId, "summarize:v1");
  assert.strictEqual(response.body.pagination.total, 1);
});

test("GET /api/usage - filters by payer", async () => {
  const payer1 = "payer1_address";
  const payer2 = "payer2_address";
  const record1 = createTestUsageRecord({ payer: payer1 });
  const record2 = createTestUsageRecord({ payer: payer2 });

  await insertUsageRecord(db, record1);
  await insertUsageRecord(db, record2);

  const response = await request("GET", "/api/usage", {
    query: { payer: payer1 },
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.length, 1);
  assert.strictEqual(response.body.data[0].payer, payer1);
});

test("GET /api/usage - filters by date range", async () => {
  const now = Date.now();
  const record1 = createTestUsageRecord({ timestamp: now - 5000 });
  const record2 = createTestUsageRecord({ timestamp: now - 2000 });
  const record3 = createTestUsageRecord({ timestamp: now });

  await insertUsageRecord(db, record1);
  await insertUsageRecord(db, record2);
  await insertUsageRecord(db, record3);

  const response = await request("GET", "/api/usage", {
    query: {
      startDate: String(now - 3000),
      endDate: String(now - 1000),
    },
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.length, 1);
  assert.strictEqual(response.body.data[0].id, record2.id);
});

test("GET /api/usage - pagination with limit and offset", async () => {
  // Insert 5 records
  const records = [];
  for (let i = 0; i < 5; i++) {
    const record = createTestUsageRecord({ timestamp: Date.now() - i * 1000 });
    records.push(record);
    await insertUsageRecord(db, record);
  }

  // Get first page
  const page1 = await request("GET", "/api/usage", {
    query: { limit: "2", offset: "0" },
  });

  assert.strictEqual(page1.status, 200);
  assert.strictEqual(page1.body.data.length, 2);
  assert.strictEqual(page1.body.pagination.total, 5);
  assert.strictEqual(page1.body.pagination.limit, 2);
  assert.strictEqual(page1.body.pagination.offset, 0);
  assert.strictEqual(page1.body.pagination.hasMore, true);

  // Get second page
  const page2 = await request("GET", "/api/usage", {
    query: { limit: "2", offset: "2" },
  });

  assert.strictEqual(page2.status, 200);
  assert.strictEqual(page2.body.data.length, 2);
  assert.strictEqual(page2.body.pagination.offset, 2);
  assert.strictEqual(page2.body.pagination.hasMore, true);

  // Get last page
  const page3 = await request("GET", "/api/usage", {
    query: { limit: "2", offset: "4" },
  });

  assert.strictEqual(page3.status, 200);
  assert.strictEqual(page3.body.data.length, 1);
  assert.strictEqual(page3.body.pagination.hasMore, false);
});

test("GET /api/usage - enforces maximum limit", async () => {
  const response = await request("GET", "/api/usage", {
    query: { limit: "2000" },
  });

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.pagination.limit, 1000); // Should be capped at 1000
});

test("GET /api/usage - validates invalid startDate", async () => {
  const response = await request("GET", "/api/usage", {
    query: { startDate: "invalid" },
  });

  assert.strictEqual(response.status, 400);
  assert.ok(response.body.error);
  assert.ok(response.body.message.includes("startDate"));
});

test("GET /api/usage - validates invalid endDate", async () => {
  const response = await request("GET", "/api/usage", {
    query: { endDate: "invalid" },
  });

  assert.strictEqual(response.status, 400);
  assert.ok(response.body.error);
  assert.ok(response.body.message.includes("endDate"));
});

test("GET /api/usage/:id - returns single usage record", async () => {
  const record = createTestUsageRecord();
  await insertUsageRecord(db, record);

  const response = await request("GET", `/api/usage/${record.id}`);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.id, record.id);
  assert.strictEqual(response.body.routeId, record.routeId);
  assert.strictEqual(response.body.payer, record.payer);
  assert.strictEqual(response.body.amount, record.amount);
});

test("GET /api/usage/:id - returns 404 for non-existent record", async () => {
  const nonExistentId = randomUUID();
  const response = await request("GET", `/api/usage/${nonExistentId}`);

  assert.strictEqual(response.status, 404);
  assert.ok(response.body.error);
  assert.ok(response.body.message.includes(nonExistentId));
});

test("GET /api/stats - returns aggregate statistics", async () => {
  // Insert test records
  await insertUsageRecord(
    db,
    createTestUsageRecord({
      routeId: "summarize:v1",
      amount: 0.03,
      status: "consumed",
      timestamp: Date.now(),
    })
  );
  await insertUsageRecord(
    db,
    createTestUsageRecord({
      routeId: "summarize:v1",
      amount: 0.03,
      status: "consumed",
      timestamp: Date.now() - 1000,
    })
  );
  await insertUsageRecord(
    db,
    createTestUsageRecord({
      routeId: "translate:v1",
      amount: 0.05,
      status: "consumed",
      timestamp: Date.now() - 2000,
    })
  );
  await insertUsageRecord(
    db,
    createTestUsageRecord({
      routeId: "summarize:v1",
      amount: 0.03,
      status: "authorized", // Should not be counted
      timestamp: Date.now() - 3000,
    })
  );

  const response = await request("GET", "/api/stats");
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.totalPayments, 3); // Only consumed records
  assert.strictEqual(response.body.totalRevenue, 0.11); // 0.03 + 0.03 + 0.05
  assert.ok(Array.isArray(response.body.usageByRoute));
  assert.ok(Array.isArray(response.body.dailyVolume));

  // Check usage by route
  const summarizeRoute = response.body.usageByRoute.find((r: any) => r.routeId === "summarize:v1");
  assert.ok(summarizeRoute);
  assert.strictEqual(summarizeRoute.count, 2);
  assert.strictEqual(summarizeRoute.revenue, 0.06);

  const translateRoute = response.body.usageByRoute.find((r: any) => r.routeId === "translate:v1");
  assert.ok(translateRoute);
  assert.strictEqual(translateRoute.count, 1);
  assert.strictEqual(translateRoute.revenue, 0.05);
});

test("GET /api/stats - returns zero stats when no records", async () => {
  const response = await request("GET", "/api/stats");
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.totalPayments, 0);
  assert.strictEqual(response.body.totalRevenue, 0);
  assert.ok(Array.isArray(response.body.usageByRoute));
  assert.strictEqual(response.body.usageByRoute.length, 0);
  assert.ok(Array.isArray(response.body.dailyVolume));
});

test("GET /api/stats - dailyVolume filters last 30 days", async () => {
  const now = Date.now();
  const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000;
  const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000;
  const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;

  await insertUsageRecord(
    db,
    createTestUsageRecord({
      timestamp: thirtyOneDaysAgo,
      status: "consumed",
      amount: 0.1,
    })
  );
  await insertUsageRecord(
    db,
    createTestUsageRecord({
      timestamp: twentyDaysAgo,
      status: "consumed",
      amount: 0.05,
    })
  );
  await insertUsageRecord(
    db,
    createTestUsageRecord({
      timestamp: tenDaysAgo,
      status: "consumed",
      amount: 0.03,
    })
  );

  const response = await request("GET", "/api/stats");
  assert.strictEqual(response.status, 200);

  // Should only include records from last 30 days
  const totalInRange = response.body.dailyVolume.reduce(
    (sum: number, day: any) => sum + day.count,
    0
  );
  assert.strictEqual(totalInRange, 2); // Only 20 and 10 days ago, not 31 days ago
});
