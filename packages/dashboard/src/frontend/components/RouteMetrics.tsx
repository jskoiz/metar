import React, { useState, useEffect } from "react";

interface RouteMetric {
  route_id: string;
  request_count: number;
  total_revenue: number;
  avg_amount: number;
  unique_payers: number;
}

export function RouteMetrics() {
  const [metrics, setMetrics] = useState<RouteMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/route-metrics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch route metrics");
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="route-metrics">
        <h3>Route Metrics</h3>
        <p>Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="route-metrics">
        <h3>Route Metrics</h3>
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="route-metrics">
        <h3>Route Metrics</h3>
        <p>No route metrics available</p>
      </div>
    );
  }

  const maxRequests = Math.max(...metrics.map((m) => m.request_count), 1);

  return (
    <div className="route-metrics">
      <h3>Usage by Route</h3>
      <div className="metrics-list">
        {metrics.map((metric) => (
          <div key={metric.route_id} className="route-metric-card">
            <div className="route-header">
              <h4>{metric.route_id}</h4>
              <div className="request-count-badge">
                {metric.request_count} requests
              </div>
            </div>
            <div className="metric-details">
              <div className="metric-item">
                <span className="metric-label">Total Revenue:</span>
                <span className="metric-value">
                  {metric.total_revenue.toFixed(4)} USDC
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Average Amount:</span>
                <span className="metric-value">
                  {metric.avg_amount.toFixed(4)} USDC
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Unique Payers:</span>
                <span className="metric-value">{metric.unique_payers}</span>
              </div>
            </div>
            <div className="usage-bar-container">
              <div
                className="usage-bar"
                style={{
                  width: `${(metric.request_count / maxRequests) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

