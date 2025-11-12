import React, { useState, useEffect } from "react";

interface Metric {
  id: number;
  route_id: string;
  agent_key_id: string | null;
  amount: number | null;
  currency: string | null;
  timestamp: number | null;
  tx_signature: string | null;
  created_at: string;
}

function App() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch metrics:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Meter Dashboard</h1>
        <p>Usage metrics and analytics</p>
      </header>
      <main>
        {loading ? (
          <p>Loading metrics...</p>
        ) : (
          <div className="metrics">
            {metrics.length === 0 ? (
              <p>No metrics available</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Route ID</th>
                    <th>Agent Key ID</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Timestamp</th>
                    <th>Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.id}>
                      <td>{metric.route_id}</td>
                      <td>{metric.agent_key_id || "N/A"}</td>
                      <td>{metric.amount ?? "N/A"}</td>
                      <td>{metric.currency || "N/A"}</td>
                      <td>
                        {metric.timestamp
                          ? new Date(metric.timestamp).toLocaleString()
                          : "N/A"}
                      </td>
                      <td>
                        {metric.tx_signature ? (
                          <code>{metric.tx_signature.slice(0, 16)}...</code>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

