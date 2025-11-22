// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [pub, setPub] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(200);

  const load = async (p) => {
    setLoading(true);
    try {
      const q = p ? `?pub_id=${encodeURIComponent(p)}&limit=${limit}` : `?limit=${limit}`;
      const res = await apiClient.get(`/fraud/alerts${q}`);
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Fraud Alerts Load ERROR:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []); // load global by default

  const resolveAlert = async (id) => {
    if (!window.confirm("Mark this alert as resolved?")) return;
    try {
      await apiClient.post("/fraud/alerts/resolve", { id, resolved_by: localStorage.getItem("mob13r_admin") || "ui" });
      load(pub);
    } catch (err) {
      console.error("Resolve error", err);
      alert("Failed to resolve");
    }
  };

  const downloadCSV = () => {
    const url = `/api/fraud/export?format=csv${pub ? `&pub_id=${encodeURIComponent(pub)}` : ""}`;
    // using apiClient to include baseURL and auth headers if necessary
    const full = apiClient.defaults.baseURL ? `${apiClient.defaults.baseURL}${url.replace(/^\/+/, "/")}` : url;
    window.open(full, "_blank");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Fraud Alerts</h1>

      <div className="flex gap-2 mb-4">
        <input className="border p-2 rounded w-64" placeholder="Filter by PUB_ID (optional)" value={pub} onChange={(e)=>setPub(e.target.value.toUpperCase())} />
        <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={()=>load(pub)}>Search</button>
        <button className="bg-gray-700 text-white px-3 py-2 rounded" onClick={()=>{ setPub(""); load(""); }}>Clear</button>
        <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={downloadCSV}>Download CSV</button>
      </div>

      {loading ? <div>Loading...</div> : (
        <table className="min-w-full text-sm bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">PUB</th>
              <th className="p-2">IP</th>
              <th className="p-2">UA</th>
              <th className="p-2">GEO</th>
              <th className="p-2">Carrier</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Severity</th>
              <th className="p-2">Resolved</th>
              <th className="p-2">When</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 && (
              <tr><td colSpan={11} className="p-4 text-center">No alerts</td></tr>
            )}
            {alerts.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-2 font-mono">{a.id}</td>
                <td className="p-2">{a.pub_id}</td>
                <td className="p-2">{a.ip}</td>
                <td className="p-2 truncate max-w-xs">{a.ua}</td>
                <td className="p-2">{a.geo}</td>
                <td className="p-2">{a.carrier}</td>
                <td className="p-2">{a.reason}</td>
                <td className="p-2">{a.severity}</td>
                <td className="p-2">{a.resolved ? "Yes" : "No"}</td>
                <td className="p-2">{new Date(a.created_at).toLocaleString()}</td>
                <td className="p-2">
                  {!a.resolved && <button className="bg-yellow-500 text-white px-2 py-1 rounded" onClick={()=>resolveAlert(a.id)}>Resolve</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
