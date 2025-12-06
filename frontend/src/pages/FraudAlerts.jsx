// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [pubFilter, setPubFilter] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("24h");

  const limit = 200;

  const loadAlerts = async () => {
    setLoading(true);
    
    try {
      const params = {
        ...(pubFilter ? { pub_id: pubFilter.toUpperCase() } : {}),
        ...(search ? { q: search } : {}),
        range,
        limit
      };

      // Correct backend route
      const res = await apiClient.get("/fraud-alerts", { params });
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Load Alerts ERROR:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => loadAlerts(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /* -----------------------------
       ACTION BUTTONS (RIGHT)
  ------------------------------*/

  const resolveAlert = async (id) => {
    if (!window.confirm("Mark as resolved?")) return;
    try {
      await apiClient.post(`/fraud/alerts/${id}/resolve`, {
        resolved_by: localStorage.getItem("mob13r_admin") || "ui"
      });
      loadAlerts();
    } catch (err) {
      console.error("Resolve error:", err);
      alert("Failed to resolve");
    }
  };

  const whitelistPUB = async () => {
    if (!selected) return alert("Select an alert");
    if (!selected.pub_id) return alert("PUB missing");

    if (!window.confirm(`Whitelist PUB ${selected.pub_id}?`)) return;

    try {
      await apiClient.post("/fraud/whitelist", {
        pub_id: selected.pub_id,
        note: "Whitelisted from UI"
      });

      alert("PUB Whitelisted");
      loadAlerts();
    } catch (err) {
      console.error("Whitelist error:", err);
      alert("Failed to whitelist");
    }
  };

  const blacklistIP = async () => {
    if (!selected) return alert("Select alert first");
    if (!selected.ip_address) return alert("IP missing");

    if (!window.confirm(`Blacklist IP ${selected.ip_address}?`)) return;

    try {
      await apiClient.post("/fraud/blacklist", {
        ip: selected.ip_address,
        note: "Blacklisted from UI"
      });

      alert("IP Blacklisted");
      loadAlerts();
    } catch (err) {
      console.error("Blacklist error:", err);
      alert("Failed to blacklist");
    }
  };

  /* -----------------------------
       EXPORT CSV / XLSX
  ------------------------------*/

  const exportFile = async (format = "csv") => {
    try {
      const params = new URLSearchParams({
        ...(pubFilter ? { pub_id: pubFilter.toUpperCase() } : {}),
        ...(search ? { q: search } : {}),
        range,
        format
      }).toString();

      const token = localStorage.getItem("mob13r_token");

      const response = await fetch(
        `${apiClient.defaults.baseURL}/fraud/export?${params}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" }
        }
      );

      if (!response.ok) return alert("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `fraud_alerts.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed");
    }
  };

  return (
    <div className="p-6">
      
      <h1 className="text-2xl font-bold mb-6">Fraud Alerts</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        
        <input
          placeholder="PUB03"
          className="border p-2 rounded w-28"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
        />

        <input
          placeholder="Search IP / Reason"
          className="border p-2 rounded w-52"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="1h">Last 1 hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>

        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={loadAlerts}>
          Search
        </button>

        {/* Right side buttons */}
        <div className="flex gap-2 ml-auto">
          <button
            className="bg-gray-700 text-white px-3 py-2 rounded"
            onClick={() => exportFile("csv")}
          >
            Export CSV
          </button>

          <button
            className="bg-gray-700 text-white px-3 py-2 rounded"
            onClick={() => exportFile("xlsx")}
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-4 gap-4">

        {/* TABLE */}
        <div className="col-span-3 bg-white rounded shadow overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2">PUB</th>
                <th className="p-2">IP</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Risk</th>
                <th className="p-2">Time</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-center p-4">Loading…</td></tr>
              )}

              {!loading &&
                alerts.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-t cursor-pointer ${
                      selected?.id === a.id ? "bg-yellow-50" : ""
                    }`}
                    onClick={() => setSelected(a)}
                  >
                    <td className="p-2">{a.publisher_name}</td>
                    <td className="p-2 font-mono">{a.ip_address}</td>
                    <td className="p-2">{a.reason}</td>
                    <td className="p-2">{a.risk_score}</td>
                    <td className="p-2">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* SIDE PANEL */}
        <div className="bg-white p-4 rounded shadow h-fit">
          <h3 className="font-semibold mb-2">Selected Alert</h3>

          {!selected ? (
            <div className="text-gray-400 text-sm">Select a row</div>
          ) : (
            <>
              <div className="text-sm mb-1"><b>PUB:</b> {selected.publisher_name}</div>
              <div className="text-sm mb-1"><b>Advertiser:</b> {selected.advertiser_name}</div>
              <div className="text-sm mb-1"><b>IP:</b> {selected.ip_address}</div>

              <div className="text-sm mb-1">
                <b>Reason:</b> {selected.reason}
              </div>

              <div className="text-sm mb-1">
                <b>Risk:</b> {selected.risk_score}
              </div>

              <div className="text-sm mb-1 text-xs">
                <b>Meta:</b>
                <pre className="bg-gray-100 p-2 rounded mt-1">
                  {JSON.stringify(selected.meta || {}, null, 2)}
                </pre>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  className="bg-green-600 text-white px-3 py-2 rounded"
                  onClick={() => resolveAlert(selected.id)}
                >
                  Resolve
                </button>

                <button
                  className="bg-blue-600 text-white px-3 py-2 rounded"
                  onClick={whitelistPUB}
                >
                  Whitelist PUB
                </button>

                <button
                  className="bg-red-600 text-white px-3 py-2 rounded"
                  onClick={blacklistIP}
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
