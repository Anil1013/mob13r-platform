import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { format } from "date-fns";

export default function InappReport() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/reports/inapp", {
        params: { from, to },
      });
      setRows(res.data);
    } catch (err) {
      console.error("Failed to load inapp report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📊 Inapp Report</h1>

      <div className="flex gap-2 mb-4">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        <button onClick={loadReport} className="px-3 py-1 bg-blue-600 text-white rounded">
          Load
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border text-xs">
          <thead className="bg-gray-100">
            <tr>
              {Object.keys(rows[0] || {}).map(k => (
                <th key={k} className="border px-2 py-1 text-left">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {Object.values(r).map((v, j) => (
                  <td key={j} className="border px-2 py-1">
                    {v ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-2">Loading...</p>}
    </div>
  );
}
