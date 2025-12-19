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
        params: { from, to, pub_id: pubId, offer_id: offerId },
      });
      setRows(res.data || []);
    } catch (err) {
      console.error("INAPP report error", err);
      alert("Failed to load report");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const exportCSV = () => {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]).join(",");
    const data = rows
      .map((r) =>
        Object.values(r)
          .map((v) => `"${v ?? ""}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([headers + "\n" + data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inapp-report-${from}-to-${to}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 INAPP Report</CardTitle>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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

          <button onClick={fetchReport}>Search</button>
          <button onClick={exportCSV}>Export CSV</button>
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border">
              <thead>
                <tr>
                  {rows[0] &&
                    Object.keys(rows[0]).map((h) => (
                      <th key={h} className="border px-2 py-1 text-left">
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
                        {v}
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
