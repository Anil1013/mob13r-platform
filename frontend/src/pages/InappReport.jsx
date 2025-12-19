import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

export default function InappReport() {
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [pubId, setPubId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/reports/inapp", {
        params: {
          from,
          to,
          pub_id: pubId || undefined,
          offer_id: offerId || undefined,
        },
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("INAPP report error", err);
      alert("Failed to load INAPP report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReport();
  }, []);

  /* ================= CSV EXPORT ================= */
  const exportCSV = () => {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]).join(",");

    const data = rows
      .map((row) =>
        Object.values(row)
          .map((val) => {
            if (val === null || val === undefined) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([headers + "\n" + data], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inapp-report-${from}-to-${to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 INAPP Report</CardTitle>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="text-xs block">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div>
            <label className="text-xs block">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <input
            placeholder="PUB_ID"
            value={pubId}
            onChange={(e) => setPubId(e.target.value)}
          />

          <input
            placeholder="Offer ID"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          />

          <button onClick={fetchReport} disabled={loading}>
            {loading ? "Loading..." : "Search"}
          </button>

          <button onClick={exportCSV} disabled={!rows.length}>
            Export CSV
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading report…</p>
        ) : !rows.length ? (
          <p className="text-sm text-gray-500">No data found for selected filters.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border text-sm">
              <thead>
                <tr>
                  {Object.keys(rows[0]).map((h) => (
                    <th key={h} className="border px-2 py-1 text-left bg-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="border px-2 py-1">
                        {String(v ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
