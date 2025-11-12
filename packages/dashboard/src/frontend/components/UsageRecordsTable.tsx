import React, { useState, useEffect } from "react";
import { FilterState } from "./Filters";

interface UsageRecord {
  id: number;
  route_id: string;
  agent_key_id: string | null;
  amount: number | null;
  currency: string | null;
  timestamp: number | null;
  tx_signature: string | null;
  payer: string | null;
  status: string | null;
  created_at: string;
}

interface UsageRecordsTableProps {
  filters: FilterState;
}

export function UsageRecordsTable({ filters }: UsageRecordsTableProps) {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.routeId) params.append("route_id", filters.routeId);
    if (filters.payer) params.append("payer", filters.payer);
    if (filters.startDate) {
      const startTimestamp = new Date(filters.startDate).getTime();
      params.append("start_date", startTimestamp.toString());
    }
    if (filters.endDate) {
      const endTimestamp = new Date(filters.endDate).getTime() + 86400000 - 1; // End of day
      params.append("end_date", endTimestamp.toString());
    }

    fetch(`/api/usage-records?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch usage records");
        return res.json();
      })
      .then((data) => {
        setRecords(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [filters]);

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (amount === null) return "N/A";
    return `${amount.toFixed(4)} ${currency || ""}`;
  };

  const truncateSignature = (sig: string | null) => {
    if (!sig) return "N/A";
    return `${sig.slice(0, 16)}...`;
  };

  if (loading) {
    return (
      <div className="usage-records-table">
        <h3>Usage Records</h3>
        <p>Loading records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usage-records-table">
        <h3>Usage Records</h3>
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="usage-records-table">
      <h3>Usage Records ({records.length})</h3>
      {records.length === 0 ? (
        <p>No usage records found</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Route ID</th>
                <th>Payer</th>
                <th>Agent Key ID</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Timestamp</th>
                <th>Transaction</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.route_id}</td>
                  <td>{record.payer || "N/A"}</td>
                  <td>{record.agent_key_id || "N/A"}</td>
                  <td>{formatAmount(record.amount, record.currency)}</td>
                  <td>{record.currency || "N/A"}</td>
                  <td>{formatTimestamp(record.timestamp)}</td>
                  <td>
                    {record.tx_signature ? (
                      <code title={record.tx_signature}>
                        {truncateSignature(record.tx_signature)}
                      </code>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>
                    <span className={`status status-${record.status || "unknown"}`}>
                      {record.status || "N/A"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

