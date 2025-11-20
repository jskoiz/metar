import React, { useState, useEffect } from "react";

interface DailyStat {
  date: string;
  count: number;
  revenue: number;
}

interface Statistics {
  totalPayments: number;
  totalRevenue: number;
  dailyStats: DailyStat[];
}

export function PaymentStatistics() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/statistics")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch statistics");
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="payment-statistics">
        <h3>Payment Statistics</h3>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-statistics">
        <h3>Payment Statistics</h3>
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const maxRevenue = Math.max(...stats.dailyStats.map(d => d.revenue || 0), 1);
  const maxCount = Math.max(...stats.dailyStats.map(d => d.count || 0), 1);

  return (
    <div className="payment-statistics">
      <h3>Payment Statistics</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Payments</div>
          <div className="stat-value">{stats.totalPayments.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{stats.totalRevenue.toFixed(4)} USDC</div>
        </div>
      </div>

      <div className="chart-section">
        <h4>Daily Activity (Last 30 Days)</h4>
        <div className="chart-container">
          <div className="chart-bars">
            {stats.dailyStats.map(day => (
              <div key={day.date} className="chart-bar-group">
                <div className="chart-bar-wrapper">
                  <div
                    className="chart-bar revenue-bar"
                    style={{
                      height: `${(day.revenue / maxRevenue) * 100}%`,
                    }}
                    title={`${day.revenue.toFixed(4)} USDC`}
                  />
                  <div
                    className="chart-bar count-bar"
                    style={{
                      height: `${(day.count / maxCount) * 100}%`,
                    }}
                    title={`${day.count} payments`}
                  />
                </div>
                <div className="chart-label">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color revenue-bar"></span>
            <span>Revenue (USDC)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color count-bar"></span>
            <span>Payment Count</span>
          </div>
        </div>
      </div>
    </div>
  );
}
