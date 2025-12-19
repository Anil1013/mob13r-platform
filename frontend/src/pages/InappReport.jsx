import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

/* ======================================================
   🔒 COLUMN DEFINITION (SINGLE SOURCE OF TRUTH)
====================================================== */
const COLUMNS = [
  { label: "PUB_ID", key: "PUB_ID" },
  { label: "Publisher Name", key: "Publisher Name" },
  { label: "Advertiser Name", key: "Advertiser Name" },
  { label: "Offer ID", key: "Offer ID" },
  { label: "Offer Name", key: "Offer Name" },
  { label: "Report Date", key: "Report Date" },

  { label: "Pin Request Count", key: "Pin Request Count" },
  { label: "Unique Pin Request Count", key: "Unique Pin Request Count" },

  { label: "Pin Send Count", key: "Pin Send Count" },
  { label: "Unique Pin Send Count", key: "Unique Pin Send Count" },

  {
    label: "Pin Validation RequestCount",
    key: "Pin Validation RequestCount",
  },
  {
    label: "Unique Pin Validation RequestCount",
    key: "Unique Pin Validation RequestCount",
  },

  { label: "Pin Validate Count", key: "Pin Validate Count" },
  { label: "Send Conversion Count", key: "Send Conversion Count" },

  { label: "Advertiser Amount", key: "Advertiser Amount" },

  { label: "Last PinGen Time", key: "Last PinGen Time" },
  { label: "Last Pin Gen SuccessTime", key: "Last Pin Gen SuccessTime" },
  {
    label: "Last PinVerficationDate Time",
    key: "Last PinVerficationDate Time",
  },
  {
    label: "Last Success PinVerficationDate Time",
    key: "Last Success PinVerficationDate Time",
  },
];

export default function InappReport() {
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [pubId, setPubId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ================= */
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
      setRows(res.data || []);
    } catch (err) {
      console.error("INAPP report error", err);
      alert("Failed to load INAPP report");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  /* ================= CSV ================= */
  const exportCSV = () => {
    if (!rows.length) return;

    const headers = COLUMNS.map((c) => c.label).join(",");

    const data = rows
      .map((row) =>
        COLUMNS.map((c) => `"${row[c.key] ?? ""}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([headers + "\n" + data], {
      type: "text/csv",
    });

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
            <table className="w-full border text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="border px-2 py-2 text-left whitespace-nowrap"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    {COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className="border px-2 py-1 whitespace-nowrap"
                      >
                        {row[c.key] ?? "-"}
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
