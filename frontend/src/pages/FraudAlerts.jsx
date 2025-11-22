import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState("");

  /* ==========================
     LOAD FRAUD LOGS
  ========================== */
  const loadAlerts = async () => {
    try {
      const r = await apiClient.get("/fraud/alerts");
      setAlerts(r.data || []);
    } catch (err) {
      console.error("Fraud Alerts Load ERROR:", err);
    }
  };

  /* Auto reload every 10 seconds */
  useEffect(() => {
    loadAlerts();
    const i = setInterval(loadAlerts, 10000);
    return () => clearInterval(i);
  }, []);

  /* ==========================
     SEARCH FILTER
  ========================== */
  const filtered = alerts.filter((a) => {
    const t = search.toLowerCase();
    return (
      a.pub_id?.toLowerCase().includes(t) ||
      a.ip?.toLowerCase().includes(t) ||
      a.user_agent?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-5">Fraud Alerts</h1>

      {/* Search */}
      <input
        className="border p-2 rounded w-1/2 mb-4"
        placeholder="Search by PUB, IP, UA…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <div className="bg-white rounded shadow p-4">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">PUB</th>
              <th className="p-2 border">IP</th>
              <th className="p-2 border">User Agent</th>
              <th className="p-2 border">Reason</th>
              <th className="p-2 border">Time</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  No alerts found.
                </td>
              </tr>
            )}

            {filtered.map((a) => (
              <tr key={a.id} className="border-t bg-red-50">
                <td className="p-2 border">{a.pub_id}</td>
                <td className="p-2 border">{a.ip}</td>
                <td className="p-2 border">{a.user_agent}</td>
                <td className="p-2 border text-red-600 font-semibold">
                  {a.reason}
                </td>
                <td className="p-2 border">
                  {new Date(a.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
