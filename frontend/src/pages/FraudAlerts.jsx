// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [pubFilter, setPubFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const limit = 300;

  const getLS = (k) =>
    typeof window === "undefined" ? null : localStorage.getItem(k);

  /* ---------------------- LOAD DATA ---------------------- */
  const load = async () => {
    setLoading(true);
    try {
      const params = {
        ...(pubFilter ? { pub_id: pubFilter.toUpperCase() } : {}),
        ...(q ? { q } : {}),
        range: "24h",
        limit,
      };

      const res = await apiClient.get("/fraud/alerts", { params });
      setAlerts(res.data || []);
    } catch (err) {
      console.error("Alerts Load ERROR:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5 * 60 * 1000); // Auto refresh every 5 min
    return () => clearInterval(timer);
  }, []);

  /* ---------------------- HANDLERS ---------------------- */
  const resolveAlert = async (id) => {
    if (!window.confirm("Mark this alert as resolved?")) return;
    try {
      await apiClient.post(`/fraud/alerts/${id}/resolve`, {
        resolved_by: getLS("mob13r_admin") || "ui",
      });
      load();
    } catch (err) {
      console.error("Resolve error:", err);
      alert("Failed to resolve alert.");
    }
  };

  const addWhitelist = async () => {
    const pub = selected?.pub_id || pubFilter;
    if (!pub) return alert("Select a PUB ID first");

    if (!window.confirm(`Whitelist PUB ${pub}?`)) return;

    try {
      await apiClient.post("/fraud/whitelist", {
        pub_id: pub.toUpperCase(),
        note: "whitelisted from UI",
        created_by: getLS("mob13r_admin_id") || null,
      });
      alert("PUB Whitelisted");
      load();
    } catch (err) {
      console.error("Whitelist error:", err);
      alert("Whitelist failed");
    }
  };

  const addBlacklist = async () => {
    const ip = selected?.ip;
    if (!ip) return alert("Select an alert that has an IP");

    if (!window.confirm(`Blacklist IP ${ip}?`)) return;

    try {
      await apiClient.post("/fraud/blacklist", {
        ip,
        note: "blacklisted from UI",
        created_by: getLS("mob13r_admin_id") || null,
      });
      alert("IP Blacklisted");
      load();
    } catch (err) {
      console.error("Blacklist error:", err);
      alert("Blacklist failed.");
    }
  };

  const exportFile = async (format = "csv") => {
    try {
      const params = new URLSearchParams({
        ...(pubFilter ? { pub_id: pubFilter.toUpperCase() } : {}),
        ...(q ? { q } : {}),
        format,
      }).toString();

      const token = getLS("mob13r_token");

      const res = await fetch(
        `${apiClient.defaults.baseURL}/fraud/export?${params}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );

      if (!res.ok) return alert("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `fraud_alerts.${format}`;
      a.click();
    } catch (err) {
      console.error("export error", err);
      alert("Export failed");
    }
  };

  /* ---------------------- SEVERITY PILL ---------------------- */
  const severityColor = (sev) => {
    if (!sev) return "bg-gray-200 text-gray-700";
    if (sev.toLowerCase() === "high") return "bg-red-100 text-red-700";
    if (sev.toLowerCase() === "medium") return "bg-orange-100 text-orange-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6">Fraud Alerts</h1>

      {/* FILTERS BAR */}
      <div className="flex gap-3 mb-5 bg-white p-4 shadow rounded-lg sticky top-0 z-10">
        <input
          placeholder="PUB ID (PUB03)"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded-lg w-40"
        />

        <input
          placeholder="Search IP / UA / Reason..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border p-2 rounded-lg w-72"
        />

        <button
          onClick={load}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Search
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportFile("csv")}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-800"
          >
            Export CSV
          </button>

          <button
            onClick={() => exportFile("xlsx")}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-800"
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-4 gap-4 h-[80vh]">
        {/* TABLE */}
        <div className="col-span-3 bg-white rounded-lg shadow overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left">PUB</th>
                <th className="p-2 text-left">IP</th>
                <th className="p-2 text-left">Geo</th>
                <th className="p-2 text-left">Carrier</th>
                <th className="p-2 text-left">Reason</th>
                <th className="p-2 text-left">Severity</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Time</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : (
                alerts.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      selected?.id === r.id ? "bg-yellow-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                    onClick={() => setSelected(r)}
                  >
                    <td className="p-2">{r.pub_id}</td>
                    <td className="p-2 font-mono">{r.ip}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {r.geo}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        {r.carrier}
                      </span>
                    </td>
                    <td className="p-2">{r.reason}</td>

                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${severityColor(
                          r.severity
                        )}`}
                      >
                        {r.severity}
                      </span>
                    </td>

                    <td className="p-2">
                      {r.resolved ? (
                        <span className="text-green-700 font-semibold">Resolved</span>
                      ) : (
                        <span className="text-red-700 font-semibold">Active</span>
                      )}
                    </td>

                    <td className="p-2">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* SIDE PANEL */}
        <div
          className={`bg-white p-5 rounded-lg shadow transition-all duration-300 ${
            selected ? "translate-x-0 opacity-100" : "translate-x-5 opacity-0"
          }`}
        >
          <h3 className="text-lg font-semibold mb-3">Alert Details</h3>

          {!selected && (
            <div className="text-gray-500 text-sm">Select an alert from the table.</div>
          )}

          {selected && (
            <>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>PUB:</strong> {selected.pub_id}
                </p>
                <p>
                  <strong>IP:</strong> {selected.ip}
                </p>
                <p>
                  <strong>UA:</strong>
                </p>
                <div className="bg-gray-100 p-2 rounded text-xs break-all max-h-32 overflow-auto">
                  {selected.ua}
                </div>

                <p>
                  <strong>Reason:</strong> {selected.reason}
                </p>

                <p>
                  <strong>Severity:</strong>{" "}
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${severityColor(
                      selected.severity
                    )}`}
                  >
                    {selected.severity}
                  </span>
                </p>

                <p>
                  <strong>Meta:</strong>
                </p>
                <pre className="bg-gray-100 p-3 rounded text-xs max-h-48 overflow-auto">
                  {JSON.stringify(selected.meta || {}, null, 2)}
                </pre>
              </div>

              {/* ACTIONS */}
              <div className="mt-4 flex flex-col gap-2">
                {!selected.resolved && (
                  <button
                    onClick={() => resolveAlert(selected.id)}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                  >
                    Resolve Alert
                  </button>
                )}

                <button
                  onClick={addWhitelist}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                >
                  Whitelist PUB
                </button>

                <button
                  onClick={addBlacklist}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
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
