// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [pubFilter, setPubFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [limit] = useState(200);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        ...(pubFilter ? { pub_id: pubFilter } : {}),
        ...(q ? { q } : {}),
        limit,
        offset: 0,
      };

      const res = await apiClient.get(`/fraud/alerts`, { params });
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

  const resolveAlert = async (id) => {
    if (!window.confirm("Mark this alert as resolved?")) return;
    try {
      await apiClient.post(`/fraud/alerts/${id}/resolve`, {
        resolved_by: localStorage.getItem("mob13r_admin") || "ui",
      });
      load();
    } catch (err) {
      console.error("Resolve error", err);
      alert("Failed to resolve");
    }
  };

  const addWhitelist = async () => {
    const pub = selected?.pub_id || pubFilter;
    if (!pub) return alert("Select a PUB first");

    if (
      !window.confirm(
        `Whitelist PUB ${pub}? This will skip fraud checks for that PUB.`
      )
    )
      return;

    try {
      await apiClient.post("/fraud/whitelist", {
        pub_id: pub,
        note: "whitelisted from UI",
        created_by: localStorage.getItem("mob13r_admin_id") || null,
      });

      alert("Whitelisted");
      load();
    } catch (err) {
      console.error("whitelist error", err);
      alert("Failed to whitelist");
    }
  };

  const addBlacklist = async () => {
    const ip = selected?.ip;
    if (!ip) return alert("Select an alert with an IP to blacklist");

    if (!window.confirm(`Blacklist IP ${ip}? This will block this IP.`)) return;

    try {
      await apiClient.post("/fraud/blacklist", {
        ip,
        note: "blacklisted from UI",
        created_by: localStorage.getItem("mob13r_admin_id") || null,
      });

      alert("Blacklisted");
      load();
    } catch (err) {
      console.error("blacklist error", err);
      alert("Failed to blacklist");
    }
  };

  // -----------------------------------------------------------
  // ✔ FIXED CSV / XLSX export (with JWT auth & file download)
  // -----------------------------------------------------------
  const exportCSV = async (format = "csv") => {
    try {
      const params = new URLSearchParams({
        ...(pubFilter ? { pub_id: pubFilter } : {}),
        ...(q ? { q } : {}),
        format,
      }).toString();

      const token = localStorage.getItem("mob13r_token");

      const response = await fetch(
        `${apiClient.defaults.baseURL}/fraud/export?${params}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Export failed:", response.status);
        return alert("Export failed");
      }

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
      console.error("export error", err);
      alert("Failed to export");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Fraud Alerts</h1>

      {/* Filters */}
      <div className="flex gap-3 items-center mb-4">
        <input
          placeholder="Filter by PUB (PUB03)"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded w-48"
        />

        <input
          placeholder="Search (ip, ua, reason...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border p-2 rounded w-72"
        />

        <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded">
          Search
        </button>

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

      {/* Table + Side panel */}
      <div className="grid grid-cols-4 gap-4">
        {/* Table */}
        <div className="col-span-3">
          <div className="bg-white rounded shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">PUB</th>
                  <th className="p-2">IP</th>
                  <th className="p-2">Geo</th>
                  <th className="p-2">Carrier</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Resolved</th>
                  <th className="p-2">Time</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center">
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading && alerts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center">
                      No alerts
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
                      <td className="p-2">{r.resolved ? "Yes" : "No"}</td>
                      <td className="p-2">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel */}
        <div className="col-span-1">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Selected Alert</h3>

            {!selected && (
              <div className="text-sm text-gray-500">
                Click a row to inspect
              </div>
            )}

            {selected && (
              <>
                <div className="text-sm">
                  <strong>PUB:</strong> {selected.pub_id}
                </div>
                <div className="text-sm">
                  <strong>IP:</strong> {selected.ip}
                </div>
                <div className="text-sm">
                  <strong>UA:</strong>{" "}
                  <div className="break-words text-xs">{selected.ua}</div>
                </div>
                <div className="text-sm">
                  <strong>Reason:</strong> {selected.reason}
                </div>
                <div className="text-sm">
                  <strong>Severity:</strong> {selected.severity}
                </div>
                <div className="text-sm">
                  <strong>Meta:</strong>
                  <pre className="text-xs">
                    {JSON.stringify(selected.meta || {}, null, 2)}
                  </pre>
                </div>

                <div className="mt-3 flex flex-col gap-2">
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

                  <button
                    onClick={() => exportCSV("csv")}
                    className="bg-gray-800 text-white px-3 py-2 rounded"
                  >
                    Export PUB CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
