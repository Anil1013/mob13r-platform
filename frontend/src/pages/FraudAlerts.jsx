// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [pubFilter, setPubFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [range, setRange] = useState("24h");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const [autoRefresh, setAutoRefresh] = useState(true);

  const limit = 200;

  const getLS = (key) => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  };

  /* -------------------------------
        Load Alerts
  ------------------------------- */
  const load = async () => {
    setLoading(true);
    try {
      const params = {
        ...(pubFilter ? { pub_id: pubFilter.toUpperCase() } : {}),
        ...(severityFilter ? { severity: severityFilter } : {}),
        ...(range ? { range } : {}),
        ...(q ? { q } : {}),
        limit,
      };

      const res = await apiClient.get(`/fraud-alerts`, { params });
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Fraud Alerts Load ERROR:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* Auto-refresh every 10 seconds */
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  /* -------------------------------
        Action Handlers
  ------------------------------- */
  const resolveAlert = async (id) => {
    if (!window.confirm("Mark this alert as resolved?")) return;
    try {
      await apiClient.post(`/fraud-alerts/${id}/resolve`, {
        resolved_by: getLS("mob13r_admin") || "ui",
      });
      load();
    } catch (err) {
      alert("Failed to resolve alert.");
    }
  };

  const addWhitelist = async () => {
    const pub = selected?.pub_id || pubFilter;
    if (!pub) return alert("Select a PUB ID");

    if (!window.confirm(`Whitelist PUB ${pub}?`)) return;

    await apiClient.post("/fraud-whitelist", {
      pub_id: pub,
      note: "UI Whitelist",
    });

    alert("PUB Whitelisted");
  };

  const addBlacklist = async () => {
    const ip = selected?.ip;
    if (!ip) return alert("Select row with an IP");

    if (!window.confirm(`Blacklist IP ${ip}?`)) return;

    await apiClient.post("/fraud-blacklist", {
      ip,
      note: "UI Blacklist",
    });

    alert("IP Blacklisted");
  };

  /* -------------------------------
        UI Components
  ------------------------------- */

  const Badge = ({ text, color }) => (
    <span
      className={`px-2 py-1 text-xs rounded-full font-semibold text-white bg-${color}-600`}
    >
      {text}
    </span>
  );

  return (
    <div className="p-6">
      {/* Title Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fraud Alerts</h1>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto Refresh (10s)
        </label>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        <input
          placeholder="PUB (PUB03)"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded"
        />

        <input
          placeholder="Search IP / UA / Reason..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border p-2 rounded col-span-2"
        />

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Severity</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>

        <button
          onClick={load}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-4 gap-4">
        {/* Table */}
        <div className="col-span-3 bg-white rounded shadow overflow-auto max-h-[600px]">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0 z-10">
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
                  <td colSpan={7} className="text-center p-4">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                alerts.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t hover:bg-gray-50 cursor-pointer ${
                      selected?.id === r.id ? "bg-yellow-50" : ""
                    }`}
                    onClick={() => setSelected(r)}
                  >
                    <td className="p-2">{r.pub_id}</td>
                    <td className="p-2 font-mono">{r.ip}</td>
                    <td className="p-2">{r.geo}</td>
                    <td className="p-2">{r.carrier}</td>
                    <td className="p-2">{r.reason}</td>

                    <td className="p-2">
                      {r.severity === "High" && (
                        <Badge text="High" color="red" />
                      )}
                      {r.severity === "Medium" && (
                        <Badge text="Medium" color="yellow" />
                      )}
                      {r.severity === "Low" && (
                        <Badge text="Low" color="green" />
                      )}
                    </td>

                    <td className="p-2">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Side Panel */}
        <div className="bg-white p-4 rounded shadow min-h-[600px]">
          <h3 className="font-semibold mb-2">Details</h3>

          {!selected && (
            <div className="text-gray-500 text-sm">Select an alert</div>
          )}

          {selected && (
            <>
              <div className="mb-2 text-sm">
                <strong>PUB:</strong> {selected.pub_id}
              </div>

              <div className="mb-2 text-sm">
                <strong>IP:</strong> {selected.ip}
              </div>

              <div className="mb-2 text-sm">
                <strong>UA:</strong>
                <pre className="text-xs bg-gray-100 p-2 rounded max-h-28 overflow-auto">
                  {selected.ua}
                </pre>
              </div>

              <div className="mb-2 text-sm">
                <strong>Severity:</strong>{" "}
                <Badge
                  text={selected.severity}
                  color={
                    selected.severity === "High"
                      ? "red"
                      : selected.severity === "Medium"
                      ? "yellow"
                      : "green"
                  }
                />
              </div>

              <div className="mb-2 text-sm">
                <strong>Reason:</strong> {selected.reason}
              </div>

              <div className="mb-2 text-sm">
                <strong>Meta:</strong>
                <pre className="text-xs bg-gray-100 p-2 rounded max-h-40 overflow-auto">
                  {JSON.stringify(selected.meta || {}, null, 2)}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-4">
                {!selected.resolved && (
                  <button
                    onClick={() => resolveAlert(selected.id)}
                    className="bg-green-600 text-white px-3 py-2 rounded"
                  >
                    Resolve
                  </button>
                )}

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
