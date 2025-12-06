// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState, useRef } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pubFilter, setPubFilter] = useState("");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [timeRange, setTimeRange] = useState("24h");

  const [selected, setSelected] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshRef = useRef(null);

  const getLS = (key) =>
    typeof window !== "undefined" ? localStorage.getItem(key) : null;

  const loadAlerts = async () => {
    setLoading(true);

    try {
      const params = {
        ...(pubFilter ? { pub_id: pubFilter.toUpperCase() } : {}),
        ...(query ? { q: query } : {}),
        ...(severity ? { severity } : {}),
        ...(timeRange ? { range: timeRange } : {}),
      };

      const res = await apiClient.get("/fraud-alerts", { params });
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Alerts Load ERROR:", err);
      setAlerts([]);
    }

    setLoading(false);
  };

  /* ==========================
      AUTO REFRESH (5 minutes)
  ========================== */
  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(() => loadAlerts(), 300000); // 5 min
    } else if (refreshRef.current) {
      clearInterval(refreshRef.current);
    }

    return () => clearInterval(refreshRef.current);
  }, [autoRefresh]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const exportCSV = async (format = "csv") => {
    try {
      const params = new URLSearchParams({
        ...(pubFilter ? { pub_id: pubFilter } : {}),
        ...(query ? { q: query } : {}),
        format,
      }).toString();

      const token = getLS("mob13r_token");

      const response = await fetch(
        `${apiClient.defaults.baseURL}/fraud-alerts/export?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) return alert("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `fraud_alerts.${format}`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export ERROR:", err);
      alert("Export failed.");
    }
  };

  const resolveAlert = async (id) => {
    if (!window.confirm("Mark alert as resolved?")) return;

    try {
      await apiClient.post(`/fraud-alerts/${id}/resolve`, {
        resolved_by: getLS("mob13r_admin") || "UI",
      });

      loadAlerts();
    } catch (err) {
      console.error("Resolve ERROR:", err);
      alert("Failed to resolve alert.");
    }
  };

  const addWhitelist = async () => {
    const pub = selected?.pub_id || pubFilter;
    if (!pub) return alert("Select a PUB first.");

    if (!window.confirm(`Whitelist PUB ${pub}?`)) return;

    try {
      await apiClient.post("/fraud/whitelist", {
        pub_id: pub.toUpperCase(),
        note: "Whitelisted from UI",
        created_by: getLS("mob13r_admin_id"),
      });

      loadAlerts();
      alert("Whitelisted successfully.");
    } catch (err) {
      console.error("Whitelist ERROR:", err);
      alert("Failed to whitelist.");
    }
  };

  const addBlacklist = async () => {
    if (!selected?.ip) return alert("Select a row with an IP.");

    if (!window.confirm(`Blacklist IP ${selected.ip}?`)) return;

    try {
      await apiClient.post("/fraud/blacklist", {
        ip: selected.ip,
        note: "Blacklisted from UI",
        created_by: getLS("mob13r_admin_id"),
      });

      alert("Blacklisted.");
    } catch (err) {
      console.error("Blacklist ERROR:", err);
      alert("Failed to blacklist IP.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Fraud Alerts</h1>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <input
          placeholder="PUB03"
          className="border p-2 rounded w-40"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
        />

        <input
          placeholder="Search IP / UA / Reason..."
          className="border p-2 rounded w-64"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          className="border p-2 rounded"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="">All Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          className="border p-2 rounded"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="24h">Last 24 Hours</option>
          <option value="48h">Last 48 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>

        <button
          onClick={loadAlerts}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>

        <label className="flex items-center gap-2 ml-auto text-sm">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto Refresh (5 min)
        </label>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Table */}
        <div className="col-span-3 bg-white rounded shadow max-h-[75vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2">PUB</th>
                <th className="p-2">IP</th>
                <th className="p-2">Geo</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Severity</th>
                <th className="p-2">Time</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center p-4">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                alerts.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t cursor-pointer ${
                      selected?.id === r.id ? "bg-yellow-100" : ""
                    }`}
                    onClick={() => setSelected(r)}
                  >
                    <td className="p-2">{r.pub_id}</td>
                    <td className="p-2">{r.ip}</td>
                    <td className="p-2">{r.geo}</td>
                    <td className="p-2">{r.carrier}</td>
                    <td className="p-2">{r.reason}</td>
                    <td className="p-2">{r.severity}</td>
                    <td className="p-2">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Side Panel */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Details</h3>

          {!selected && <p className="text-gray-500 text-sm">Select an alert</p>}

          {selected && (
            <>
              <div className="text-sm mb-1">
                <strong>PUB:</strong> {selected.pub_id}
              </div>

              <div className="text-sm mb-1">
                <strong>IP:</strong> {selected.ip}
              </div>

              <div className="text-sm mb-1">
                <strong>UA:</strong>
                <div className="text-xs break-all">{selected.ua}</div>
              </div>

              <div className="text-sm mb-1">
                <strong>Reason:</strong> {selected.reason}
              </div>

              <div className="text-sm mb-1">
                <strong>Severity:</strong> {selected.severity}
              </div>

              <div className="text-sm mb-2">
                <strong>Meta:</strong>
                <pre className="bg-gray-100 p-2 rounded text-xs">
                  {JSON.stringify(selected.meta || {}, null, 2)}
                </pre>
              </div>

              <div className="flex flex-col gap-2 mt-3">
                <button
                  className="bg-green-600 text-white px-3 py-2 rounded"
                  onClick={() => resolveAlert(selected.id)}
                >
                  Resolve
                </button>

                <button
                  className="bg-blue-600 text-white px-3 py-2 rounded"
                  onClick={addWhitelist}
                >
                  Whitelist PUB
                </button>

                <button
                  className="bg-red-600 text-white px-3 py-2 rounded"
                  onClick={addBlacklist}
                >
                  Blacklist IP
                </button>

                <button
                  className="bg-gray-700 text-white px-3 py-2 rounded"
                  onClick={() => exportCSV("csv")}
                >
                  Export CSV
                </button>

                <button
                  className="bg-gray-700 text-white px-3 py-2 rounded"
                  onClick={() => exportCSV("xlsx")}
                >
                  Export XLSX
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
