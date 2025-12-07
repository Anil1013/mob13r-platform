// frontend/src/pages/Clicks.jsx
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import apiClient from "../api/apiClient";
import { format } from "date-fns";

export default function ClicksPage() {
  const [rows, setRows] = useState([]);
  const [group, setGroup] = useState("none");
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);

  const [from, setFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const [pubId, setPubId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [q, setQ] = useState("");

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const API = "/api/analytics/clicks";   // FIXED ENDPOINT

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = {
        pub_id: pubId || undefined,
        offer_id: offerId ? Number(offerId) : undefined, // FIXED
        geo: geo || undefined,
        carrier: carrier || undefined,
        q: q || undefined,
        from,
        to,
        group,
        limit,
        offset,
      };

      const { data } = await apiClient.get(API, { params });
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("fetchData error", err);
      alert("Failed to fetch clicks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onApply = () => {
    setOffset(0);
    fetchData();
  };

  const resetFilters = () => {
    setPubId("");
    setOfferId("");
    setGeo("");
    setCarrier("");
    setQ("");
    setFrom(format(new Date(), "yyyy-MM-dd"));
    setTo(format(new Date(), "yyyy-MM-dd"));
    setGroup("none");
    setOffset(0);
    fetchData();
  };

  const exportCsv = async () => {
    try {
      const params = {
        pub_id: pubId || undefined,
        offer_id: offerId ? Number(offerId) : undefined,
        geo: geo || undefined,
        carrier: carrier || undefined,
        q: q || undefined,
        from,
        to,
        group,
        format: "csv",
      };

      const resp = await apiClient.get(API, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([resp.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `clicks-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportCsv error:", err);
      alert("CSV Export Failed");
    }
  };

  const thStyle = { textAlign: "center", padding: "10px 6px", background: "#f3f4f6" };
  const tdStyle = { textAlign: "center", padding: "10px 6px" };

  return (
    <div className="p-6 w-full overflow-x-hidden" style={{ maxWidth: "100%" }}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Clicks Analytics</CardTitle>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <input placeholder="PUB ID" value={pubId} onChange={(e) => setPubId(e.target.value)} className="border rounded p-2" />
            <input placeholder="Offer ID" value={offerId} onChange={(e) => setOfferId(e.target.value)} className="border rounded p-2" />
            <input placeholder="GEO" value={geo} onChange={(e) => setGeo(e.target.value)} className="border rounded p-2" />
            <input placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="border rounded p-2" />
            <input placeholder="Search IP / UA" value={q} onChange={(e) => setQ(e.target.value)} className="border rounded p-2" />

            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded p-2" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded p-2" />

            <select value={group} onChange={(e) => setGroup(e.target.value)} className="border rounded p-2">
              <option value="none">No Group</option>
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
            </select>

            <button onClick={onApply} className="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>
            <button onClick={resetFilters} className="bg-gray-500 text-white px-4 py-2 rounded">Reset</button>
            <button onClick={exportCsv} className="bg-black text-white px-4 py-2 rounded">Export CSV</button>
          </div>
        </CardHeader>

        <CardContent>
          <div style={{ display: "flex", textAlign: "center", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12 }}>Total Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{total}</div>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse" style={{ minWidth: 1300 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Publisher</th>
                  <th style={thStyle}>Publisher Name</th>
                  <th style={thStyle}>Offer</th>
                  <th style={thStyle}>Offer Name</th>
                  <th style={thStyle}>Advertiser</th>
                  <th style={thStyle}>IP</th>
                  <th style={thStyle}>Click ID</th>
                  <th style={thStyle}>GEO</th>
                  <th style={thStyle}>Carrier</th>
                  <th style={thStyle}>UA</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan={12} style={tdStyle}>Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={12} style={tdStyle}>No Data</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={tdStyle}>{r.pub_id}</td>
                      <td style={tdStyle}>{r.publisher_name}</td>
                      <td style={tdStyle}>{r.offer_code}</td>
                      <td style={tdStyle}>{r.offer_name}</td>
                      <td style={tdStyle}>{r.advertiser_name}</td>
                      <td style={tdStyle}>{r.ip}</td>
                      <td style={tdStyle}>{r.click_id}</td>
                      <td style={tdStyle}>{r.geo}</td>
                      <td style={tdStyle}>{r.carrier}</td>
                      <td style={{ ...tdStyle, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.ua}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <div>
              <button
                onClick={() => {
                  setOffset(Math.max(0, offset - limit));
                  fetchData();
                }}
                className="border rounded px-3 py-1 mr-2"
              >
                Prev
              </button>

              <button
                onClick={() => {
                  setOffset(offset + limit);
                  fetchData();
                }}
                className="border rounded px-3 py-1"
              >
                Next
              </button>
            </div>

            <div>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="border rounded p-2">
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
