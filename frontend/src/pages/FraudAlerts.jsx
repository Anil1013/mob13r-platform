// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import dayjs from "dayjs";

export default function FraudAlerts() {
  /* =======================
      STATE
  ======================= */
  const today = dayjs().format("YYYY-MM-DD");

  const [pubId, setPubId] = useState("");
  const [severity, setSeverity] = useState("");
  const [geo, setGeo] = useState("");
  const [search, setSearch] = useState("");

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [hasMore, setHasMore] = useState(false);

  /* =======================
      LOAD ALERTS
  ======================= */
  const loadAlerts = async (resetOffset = false) => {
    try {
      setLoading(true);

      const currentOffset = resetOffset ? 0 : offset;

      const q = new URLSearchParams({
        pub_id: pubId || "",
        q: search || "",
        severity: severity || "",
        geo: geo || "",
        from,
        to,
        limit,
        offset: currentOffset,
      }).toString();

      const res = await apiClient.get(`/fraud/alerts?${q}`);
      const rows = res.data || [];

      setAlerts(resetOffset ? rows : [...alerts, ...rows]);

      setHasMore(rows.length === limit);
      setOffset(currentOffset + limit);
    } catch (err) {
      console.error("loadAlerts error", err);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
      RESOLVE ALERT
  ======================= */
  const resolveAlert = async (id) => {
    if (!window.confirm("Resolve this alert?")) return;
    try {
      await apiClient.post(`/fraud/alerts/${id}/resolve`, {
        resolved_by: "admin",
      });
      loadAlerts(true);
    } catch (err) {
      console.error("resolve error", err);
    }
  };

  /* =======================
      EXPORT
  ======================= */
  const exportData = (type) => {
    const q = new URLSearchParams({
      pub_id: pubId || "",
      q: search || "",
      severity: severity || "",
      geo: geo || "",
      from,
      to,
      format: type,
    }).toString();

    window.open(`/fraud/export?${q}`, "_blank");
  };

  /* =======================
      AUTORELOAD ON FILTER CHANGE
  ======================= */
  const applyFilters = () => loadAlerts(true);

  /* =======================
      UI
  ======================= */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Fraud Alerts</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-6 gap-4">
        <input
          className="border p-2 rounded"
          placeholder="PUB ID (e.g. PUB03)"
          value={pubId}
          onChange={(e) => setPubId(e.target.value.toUpperCase())}
        />

        <select
          className="border p-2 rounded"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="">Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <input
          className="border p-2 rounded"
          placeholder="GEO (IN, BD...)"
          value={geo}
          onChange={(e) => setGeo(e.target.value.toUpperCase())}
        />

        <input
          className="border p-2 rounded col-span-2"
          placeholder="Search (IP / UA / Reason...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <button
          className="bg-blue-600 text-white p-2 rounded"
          onClick={() => applyFilters()}
        >
          Apply
        </button>

        <button
          className="bg-gray-700 text-white p-2 rounded"
          onClick={() => {
            setPubId("");
            setSeverity("");
            setGeo("");
            setSearch("");
            setFrom(today);
            setTo(today);
            loadAlerts(true);
          }}
        >
          Reset
        </button>

        <button
          className="bg-green-600 text-white p-2 rounded"
          onClick={() => exportData("csv")}
        >
          Export CSV
        </button>

        <button
          className="bg-green-700 text-white p-2 rounded"
          onClick={() => exportData("xlsx")}
        >
          Export XLSX
        </button>
      </div>

      {/* Alert Table */}
      <div className="bg-white p-4 rounded shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">PUB</th>
                <th className="p-2">IP</th>
                <th className="p-2">Geo</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Severity</th>
                <th className="p-2">UA</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {alerts.length === 0 && (
                <tr>
                  <td colSpan="9" className="p-4 text-center text-gray-500">
                    No alerts found
                  </td>
                </tr>
              )}

              {alerts.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-2">{dayjs(a.created_at).format("DD-MM-YYYY HH:mm")}</td>
                  <td className="p-2">{a.pub_id}</td>
                  <td className="p-2">{a.ip}</td>
                  <td className="p-2">{a.geo}</td>
                  <td className="p-2">{a.carrier}</td>
                  <td className="p-2">{a.reason}</td>
                  <td className="p-2">{a.severity}</td>
                  <td className="p-2 truncate max-w-xs">{a.ua}</td>
                  <td className="p-2">
                    {!a.resolved ? (
                      <button
                        className="bg-green-600 text-white px-2 py-1 rounded"
                        onClick={() => resolveAlert(a.id)}
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-green-600 font-semibold">Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="text-center p-4 text-gray-600">Loading...</div>
          )}

          {hasMore && !loading && (
            <div className="text-center py-4">
              <button
                onClick={() => loadAlerts(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
