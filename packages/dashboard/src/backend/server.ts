import express from "express";
import sqlite3 from "sqlite3";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Database setup (sqlite3 to match meter-provider)
const db = new sqlite3.Database(":memory:");

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id TEXT NOT NULL,
      agent_key_id TEXT,
      amount REAL,
      currency TEXT,
      timestamp INTEGER,
      tx_signature TEXT,
      payer TEXT,
      status TEXT DEFAULT 'consumed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Insert sample data for development
  const stmt = db.prepare(`
    INSERT INTO usage_metrics (route_id, agent_key_id, amount, currency, timestamp, tx_signature, payer, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = Date.now();
  const sampleData = [
    ["summarize:v1", "agent-1", 0.01, "USDC", now - 86400000, "sig1", "payer1", "consumed"],
    ["summarize:v1", "agent-2", 0.01, "USDC", now - 43200000, "sig2", "payer2", "consumed"],
    ["translate:v1", "agent-1", 0.02, "USDC", now - 3600000, "sig3", "payer1", "consumed"],
    ["summarize:v1", "agent-3", 0.01, "USDC", now - 1800000, "sig4", "payer3", "consumed"],
    ["analyze:v1", "agent-2", 0.03, "USDC", now - 600000, "sig5", "payer2", "consumed"],
  ];
  
  sampleData.forEach((row) => stmt.run(row));
  stmt.finalize();
});

// Helper function to promisify db.all
function dbAll(query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "dashboard-backend" });
});

// Get usage records with filtering
app.get("/api/usage-records", async (req, res) => {
  try {
    const { route_id, payer, start_date, end_date, limit = "100", offset = "0" } = req.query;
    
    let query = "SELECT * FROM usage_metrics WHERE 1=1";
    const params: any[] = [];
    
    if (route_id) {
      query += " AND route_id = ?";
      params.push(route_id);
    }
    
    if (payer) {
      query += " AND payer = ?";
      params.push(payer);
    }
    
    if (start_date) {
      query += " AND timestamp >= ?";
      params.push(parseInt(start_date as string));
    }
    
    if (end_date) {
      query += " AND timestamp <= ?";
      params.push(parseInt(end_date as string));
    }
    
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const rows = await dbAll(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Get payment statistics
app.get("/api/statistics", async (_req, res) => {
  try {
    const [totalPayments, totalRevenue, dailyStats] = await Promise.all([
      dbAll("SELECT COUNT(*) as count FROM usage_metrics"),
      dbAll("SELECT SUM(amount) as total FROM usage_metrics WHERE currency = 'USDC'"),
      dbAll(`
        SELECT 
          DATE(datetime(timestamp / 1000, 'unixepoch')) as date,
          COUNT(*) as count,
          SUM(amount) as revenue
        FROM usage_metrics
        WHERE timestamp IS NOT NULL
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
      `),
    ]);
    
    res.json({
      totalPayments: totalPayments[0]?.count || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      dailyStats: dailyStats,
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Get route metrics
app.get("/api/route-metrics", async (_req, res) => {
  try {
    const rows = await dbAll(`
      SELECT 
        route_id,
        COUNT(*) as request_count,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_amount,
        COUNT(DISTINCT payer) as unique_payers
      FROM usage_metrics
      GROUP BY route_id
      ORDER BY request_count DESC
    `);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Get unique routes for filter dropdown
app.get("/api/routes", async (_req, res) => {
  try {
    const rows = await dbAll("SELECT DISTINCT route_id FROM usage_metrics ORDER BY route_id");
    res.json(rows.map((r: any) => r.route_id));
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Get unique payers for filter dropdown
app.get("/api/payers", async (_req, res) => {
  try {
    const rows = await dbAll("SELECT DISTINCT payer FROM usage_metrics WHERE payer IS NOT NULL ORDER BY payer");
    res.json(rows.map((r: any) => r.payer));
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Legacy endpoint for backward compatibility
app.get("/api/metrics", async (_req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM usage_metrics ORDER BY created_at DESC LIMIT 100");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Dashboard backend server running on http://localhost:${PORT}`);
  });
}

export { app, db };

