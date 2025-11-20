import React, { useState, useEffect } from "react";

export interface FilterState {
  routeId: string;
  payer: string;
  startDate: string;
  endDate: string;
}

interface FiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export function Filters({ onFilterChange }: FiltersProps) {
  const [routes, setRoutes] = useState<string[]>([]);
  const [payers, setPayers] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    routeId: "",
    payer: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    // Fetch available routes and payers
    Promise.all([
      fetch("/api/routes").then(res => res.json()),
      fetch("/api/payers").then(res => res.json()),
    ])
      .then(([routesData, payersData]) => {
        setRoutes(routesData);
        setPayers(payersData);
      })
      .catch(err => console.error("Failed to fetch filter options:", err));
  }, []);

  const handleChange = (field: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClear = () => {
    const clearedFilters: FilterState = {
      routeId: "",
      payer: "",
      startDate: "",
      endDate: "",
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="filters">
      <h3>Filters</h3>
      <div className="filters-grid">
        <div className="filter-group">
          <label htmlFor="route-filter">Route</label>
          <select
            id="route-filter"
            value={filters.routeId}
            onChange={e => handleChange("routeId", e.target.value)}
          >
            <option value="">All Routes</option>
            {routes.map(route => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="payer-filter">Payer</label>
          <select
            id="payer-filter"
            value={filters.payer}
            onChange={e => handleChange("payer", e.target.value)}
          >
            <option value="">All Payers</option>
            {payers.map(payer => (
              <option key={payer} value={payer}>
                {payer}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={filters.startDate}
            onChange={e => handleChange("startDate", e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            value={filters.endDate}
            onChange={e => handleChange("endDate", e.target.value)}
          />
        </div>
      </div>

      <button className="clear-filters" onClick={handleClear}>
        Clear Filters
      </button>
    </div>
  );
}
