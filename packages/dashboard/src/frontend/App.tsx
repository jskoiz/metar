import React, { useState } from "react";
import {
  Filters,
  FilterState,
  UsageRecordsTable,
  PaymentStatistics,
  RouteMetrics,
} from "./components";

function App() {
  const [filters, setFilters] = useState<FilterState>({
    routeId: "",
    payer: "",
    startDate: "",
    endDate: "",
  });

  return (
    <div className="app">
      <header>
        <h1>Metar Dashboard</h1>
        <p>Usage metrics and analytics</p>
      </header>
      <main>
        <div className="dashboard-layout">
          <section className="statistics-section">
            <PaymentStatistics />
          </section>

          <section className="filters-section">
            <Filters onFilterChange={setFilters} />
          </section>

          <section className="route-metrics-section">
            <RouteMetrics />
          </section>

          <section className="usage-records-section">
            <UsageRecordsTable filters={filters} />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
