import express from "express";
import sqlite3 from "sqlite3";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "dashboard-backend" });
});

// API routes placeholder
app.get("/api/metrics", (_req, res) => {
  db.all("SELECT * FROM usage_metrics ORDER BY created_at DESC LIMIT 100", (err, rows) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
      return;
    }
    res.json(rows);
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Dashboard backend server running on http://localhost:${PORT}`);
  });
}

export { app, db };

