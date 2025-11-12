/**
 * Dashboard Backend API Server
 * 
 * Express API server for dashboard usage records and statistics.
 * Provides endpoints for querying usage records with filtering, pagination,
 * and aggregate statistics.
 * 
 * @see {@link file://hackathon/technical-specifications.md | Technical Specifications}
 */

import express, { Request, Response } from "express";
import { Database } from "sqlite3";
import { UsageRecord } from "@meter/shared-types";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Database setup (sqlite3 to match meter-provider)
const db = new Database(process.env.DATABASE_PATH || ":memory:");

/**
 * Initialize database schema matching UsageRecord model.
 * Uses the same schema as meter-provider for consistency.
 */
function initializeDatabase(db: Database): Promise<void> {
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
        (err) => {
          if (err) {
            reject(err);
            return;
          }
        }
      );

      db.run(
        `CREATE INDEX IF NOT EXISTS idx_tx_sig ON usage_records(tx_sig)`,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
        }
      );

      db.run(
        `CREATE INDEX IF NOT EXISTS idx_route_id ON usage_records(route_id)`,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
        }
      );

      db.run(
        `CREATE INDEX IF NOT EXISTS idx_payer ON usage_records(payer)`,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
        }
      );

      db.run(
        `CREATE INDEX IF NOT EXISTS idx_timestamp ON usage_records(timestamp)`,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  });
}

// Initialize database on startup (only if running as main module)
if (require.main === module) {
  initializeDatabase(db).catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
}

// Export initializeDatabase for testing
export { initializeDatabase };

/**
 * Convert database row to UsageRecord format
 */
function rowToUsageRecord(row: any): UsageRecord {
  return {
    id: row.id,
    routeId: row.route_id,
    txSig: row.tx_sig,
    payer: row.payer,
    amount: row.amount,
    timestamp: row.timestamp,
    nonce: row.nonce,
    status: row.status as "authorized" | "consumed" | "refunded",
    reqHash: row.req_hash || undefined,
    agentKeyId: row.agent_key_id || undefined,
  };
}

/**
 * Error handling middleware
 */
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "dashboard-backend" });
});

/**
 * GET /api/usage - List usage records with filtering and pagination
 * 
 * Query parameters:
 * - routeId?: Filter by route identifier
 * - payer?: Filter by payer wallet address
 * - startDate?: Filter by start timestamp (Unix milliseconds)
 * - endDate?: Filter by end timestamp (Unix milliseconds)
 * - limit?: Maximum number of records to return (default: 100, max: 1000)
 * - offset?: Number of records to skip (default: 0)
 */
app.get("/api/usage", (req: Request, res: Response) => {
  const { routeId, payer, startDate, endDate, limit, offset } = req.query;

  // Build WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];

  if (routeId) {
    conditions.push("route_id = ?");
    params.push(routeId);
  }

  if (payer) {
    conditions.push("payer = ?");
    params.push(payer);
  }

  if (startDate) {
    const startTimestamp = parseInt(startDate as string, 10);
    if (isNaN(startTimestamp)) {
      res.status(400).json({
        error: "Bad Request",
        message: "startDate must be a valid Unix timestamp in milliseconds",
      });
      return;
    }
    conditions.push("timestamp >= ?");
    params.push(startTimestamp);
  }

  if (endDate) {
    const endTimestamp = parseInt(endDate as string, 10);
    if (isNaN(endTimestamp)) {
      res.status(400).json({
        error: "Bad Request",
        message: "endDate must be a valid Unix timestamp in milliseconds",
      });
      return;
    }
    conditions.push("timestamp <= ?");
    params.push(endTimestamp);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Parse pagination parameters
  const limitValue = Math.min(parseInt((limit as string) || "100", 10), 1000);
  const offsetValue = Math.max(parseInt((offset as string) || "0", 10), 0);

  if (isNaN(limitValue) || limitValue < 1) {
    res.status(400).json({
      error: "Bad Request",
      message: "limit must be a positive integer",
    });
    return;
  }

  if (isNaN(offsetValue) || offsetValue < 0) {
    res.status(400).json({
      error: "Bad Request",
      message: "offset must be a non-negative integer",
    });
    return;
  }

  // Get total count for pagination metadata
  const countQuery = `SELECT COUNT(*) as total FROM usage_records ${whereClause}`;
  
  db.get(countQuery, params, (err, countRow: any) => {
    if (err) {
      console.error("Database error:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to query database",
      });
      return;
    }

    const total = countRow?.total || 0;

    // Get records
    const query = `
      SELECT * FROM usage_records 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    const queryParams = [...params, limitValue, offsetValue];

    db.all(query, queryParams, (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        res.status(500).json({
          error: "Internal Server Error",
          message: "Failed to query database",
        });
        return;
      }

      const records = (rows || []).map(rowToUsageRecord);

      res.json({
        data: records,
        pagination: {
          total,
          limit: limitValue,
          offset: offsetValue,
          hasMore: offsetValue + limitValue < total,
        },
      });
    });
  });
});

/**
 * GET /api/usage/:id - Get single usage record by ID
 */
app.get("/api/usage/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  db.get(
    "SELECT * FROM usage_records WHERE id = ?",
    [id],
    (err, row) => {
      if (err) {
        console.error("Database error:", err);
        res.status(500).json({
          error: "Internal Server Error",
          message: "Failed to query database",
        });
        return;
      }

      if (!row) {
        res.status(404).json({
          error: "Not Found",
          message: `Usage record with id ${id} not found`,
        });
        return;
      }

      res.json(rowToUsageRecord(row));
    }
  );
});

/**
 * GET /api/stats - Aggregate statistics
 * 
 * Returns:
 * - totalPayments: Total number of payments
 * - totalRevenue: Sum of all payment amounts
 * - usageByRoute: Usage count and revenue grouped by route
 * - dailyVolume: Daily payment volume (last 30 days)
 */
app.get("/api/stats", (_req: Request, res: Response) => {
  // Get total payments and revenue
  db.get(
    `SELECT 
      COUNT(*) as totalPayments,
      COALESCE(SUM(amount), 0) as totalRevenue
    FROM usage_records
    WHERE status = 'consumed'`,
    [],
    (err, totalsRow: any) => {
      if (err) {
        console.error("Database error:", err);
        res.status(500).json({
          error: "Internal Server Error",
          message: "Failed to query database",
        });
        return;
      }

      // Get usage by route
      db.all(
        `SELECT 
          route_id as routeId,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as revenue
        FROM usage_records
        WHERE status = 'consumed'
        GROUP BY route_id
        ORDER BY revenue DESC`,
        [],
        (err, routeRows) => {
          if (err) {
            console.error("Database error:", err);
            res.status(500).json({
              error: "Internal Server Error",
              message: "Failed to query database",
            });
            return;
          }

          // Get daily volume (last 30 days)
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          db.all(
            `SELECT 
              DATE(timestamp / 1000, 'unixepoch') as date,
              COUNT(*) as count,
              COALESCE(SUM(amount), 0) as revenue
            FROM usage_records
            WHERE status = 'consumed' AND timestamp >= ?
            GROUP BY DATE(timestamp / 1000, 'unixepoch')
            ORDER BY date DESC
            LIMIT 30`,
            [thirtyDaysAgo],
            (err, dailyRows) => {
              if (err) {
                console.error("Database error:", err);
                res.status(500).json({
                  error: "Internal Server Error",
                  message: "Failed to query database",
                });
                return;
              }

              res.json({
                totalPayments: totalsRow?.totalPayments || 0,
                totalRevenue: totalsRow?.totalRevenue || 0,
                usageByRoute: (routeRows || []).map((row: any) => ({
                  routeId: row.routeId,
                  count: row.count,
                  revenue: row.revenue,
                })),
                dailyVolume: (dailyRows || []).map((row: any) => ({
                  date: row.date,
                  count: row.count,
                  revenue: row.revenue,
                })),
              });
            }
          );
        }
      );
    }
  );
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Dashboard backend server running on http://localhost:${PORT}`);
  });
}

export { app, db };

