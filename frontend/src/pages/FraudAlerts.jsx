// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState, useRef } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [pubFilter, setPubFilter] = useState("");
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("all");
  const [range, setRange] = useState("24h");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshTimer = useRef(null);
  const LIMIT = 300;

  const getLS = (k) =>
    typeof window !== "undefined" ? localStorage.getItem(k) : null;

  /* ---------------------------------------------
     LOAD ALERTS
  --------------------------------------------- */
  const load = async () => {
    setLoading(true);
    try {
      const params = {
        ...(pubFilter ? { pub_id: pubFilter.toUpperCase() } : {}),
        ...(q ? { q } : {}),
        ...(severity !== "all" ? { severity } : {}),
        range,
        limit: LIMIT,
      };

      const res = await apiClient.get(`/fraud/fraud-alerts`, { params });
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Alerts Load ERROR:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------
     AUTO REFRESH (Every 5 Minutes)
  --------------------------------------------- */
  useEffect(() => {
    load();

    if (autoRefresh) {
      refreshTimer.current = setInterval(() => {
        load();
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => clearInterval(refreshTimer.current);
  }, [autoRefresh]);

  /* ---------------------------------------------
     RESOLVE ALERT
  --------------------------------------------- */
  const resolveAlert = async (id) => {
    if (!window.confirm("Mark this alert as resolved?")) return;

    try {
      await apiClient.post(`/fraud/fraud-alerts/${id}/resolve`, {
        resolved_by: getLS("mob13r_admin") || "UI",
      });
      load();
    } catch (err) {
      console.error("Resolve error:", err);
      alert("Failed to resolve alert.");
    }
  };

  /* ---------------------------------------------
     WHITELIST PUB
  --------------------------------------------- */
  const addWhitelist = async () => {
    if (!selected?.pub_id) return alert("Select a PUB first");

    if (!window.confirm(`Whitelist PUB ${selected.pub_id}?`)) return;

    try {
      await apiClient.post(`/fraud/whitelist`, {
        pub_id: selected.pub_id,
        note: "whitelisted from UI",
        created_by: getLS("mob13r_admin_id") || null,
      });

      alert("PUB added to whitelist.");
      load();
    } catch (err) {
      console.error("Whitelist error:", err);
      alert("Whitelist failed");
    }
  };

  /* ---------------------------------------------
     BLACKLIST IP
  --------------------------------------------- */
  const addBlacklist = async () => {
    if (!selected?.ip) return alert("Select an alert with an IP");

    if (!window.confirm(`Blacklist IP ${selected.ip}?`)) return;

    try {
      await apiClient.post(`/fraud/blacklist`, {
        ip: selected.ip,
        note: "blacklisted from UI",
        created_by: getLS("mob13r_admin_id") || null,
      });

      alert("IP blacklisted.");
      load();
    } catch (err) {
      console.error("Blacklist error:", err);
      alert("Failed to blacklist IP.");
    }
  };

  /* ---------------------------------------------
     EXPORT CSV / XLSX
  --------------------------------------------- */
  const exportCSV = async (format = "csv") => {
    try {
      const params = new URLSearchParams({
        ...(pubFilter ? { pub_id: pubFilter.toUpperCase() } : {}),
        ...(q ? { q } : {}),
        format,
      });

      const token = getLS("mob13r_token");

      const response = await fetch(
        `${apiClient.defaults.baseURL}/fraud/fraud-alerts/export?${params}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
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
      console.error("Export error:", err);
      alert("Export failed");
    }
  };

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Fraud Alerts</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4 items-center">
        <input
          placeholder="PUB (PUB03)"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded w-40"
        />

        <input
          placeholder="Search IP / UA / Reason..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border p-2 rounded w-60"
        />

        <select
          className="border p-2 rounded"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="all">All Severity</option>
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          className="border p-2 rounded"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          <option value="1h">Last 1 Hour</option>
          <option value="3h">Last 3 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>

        <button
          onClick={load}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>

        {/* Auto Refresh */}
        <label className="flex items-center gap-2 ml-4 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={() => setAutoRefresh(!autoRefresh)}
          />
          Auto Refresh (5 mins)
        </label>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportCSV("csv")}
            className="bg-gray-700 text-white px-3 py-2 rounded"
          >
            Export CSV
          </button>

          <button
            onClick={() => exportCSV("xlsx")}
            className="bg-gray-700 text-white px-3 py-2 rounded"
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-4 gap-4">
        {/* Table */}
        <div className="col-span-3 bg-white rounded shadow max-h-[70vh] overflow-auto">
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
                  <td colSpan={7} className="p-4 text-center">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                alerts.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t cursor-pointer ${
                      selected?.id === r.id ? "bg-yellow-50" : ""
                    }`}
                    onClick={() => setSelected(r)}
                  >
                    <td className="p-2">{r.pub_id}</td>
                    <td className="p-2 font-mono">{r.ip}</td>
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

          {!selected && (
            <div className="text-sm text-gray-500">Select an alert</div>
          )}

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

              <div className="text-sm mb-1">
                <strong>Meta:</strong>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(selected.meta || {}, null, 2)}
                </pre>
              </div>

              <div className="flex flex-col gap-2 mt-3">
                <button
                  onClick={() => resolveAlert(selected.id)}
                  className="bg-green-600 text-white px-3 py-2 rounded"
                >
                  Resolve
                </button>

                <button
                  onClick={addWhitelist}
                  className="bg-blue-600 text-white px-3 py-2 rounded"
                >
                  Whitelist PUB
                </button>

                <button
                  onClick={addBlacklist}
                  className="bg-red-600 text-white px-3 py-2 rounded"
                >
                  Blacklist IP
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
