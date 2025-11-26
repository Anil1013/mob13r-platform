// frontend/src/pages/Clicks.jsx
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import apiClient from "../api/apiClient";
import { format } from "date-fns";

const getToday = () => format(new Date(), "yyyy-MM-dd");

export default function ClicksPage() {
  const [rows, setRows] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [group, setGroup] = useState("none");

  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);

  const [from, setFrom] = useState(""); // UI can be empty; backend will default to today
  const [to, setTo] = useState("");

  const [pubId, setPubId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [q, setQ] = useState("");

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // backend route (through apiClient -> /api prefix)
  const API = "/analytics/clicks";

  const fetchData = async (nextOffset = offset, nextLimit = limit) => {
    try {
      setLoading(true);

      const params = {
        pub_id: pubId || undefined,
        offer_id: offerId || undefined,
        geo: geo || undefined,
        carrier: carrier || undefined,
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        group,
        limit: nextLimit,
        offset: nextOffset,
      };

      const { data } = await apiClient.get(API, { params });

      setRows(data.rows || []);
      setTotal(data.total || 0);
      setChartData((data.chart || []).map((c) => ({
        time: new Date(c.bucket || c.t).toLocaleString(),
        clicks: c.clicks,
      })));

      // keep backend dates (in case it defaulted to today)
      if (!from && data.from) setFrom(data.from.slice(0, 10));
      if (!to && data.to) setTo(data.to.slice(0, 10));

      setOffset(nextOffset);
      setLimit(nextLimit);
    } catch (err) {
      console.error("fetchData error", err);
      alert("Failed to fetch clicks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load – backend will default to today's date if from/to empty
    fetchData(0, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = () => {
    fetchData(0, limit);
  };

  const exportCsv = async () => {
    try {
      const params = {
        pub_id: pubId || undefined,
        offer_id: offerId || undefined,
        geo: geo || undefined,
        carrier: carrier || undefined,
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
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
      alert("Failed to export CSV.");
    }
  };

  const thStyle = { textAlign: "center", padding: "10px 6px", background: "#f3f4f6" };
  const tdStyle = { textAlign: "center", padding: "10px 6px" };

  const handlePrev = () => {
    const newOffset = Math.max(0, offset - limit);
    fetchData(newOffset, limit);
  };

  const handleNext = () => {
    const newOffset = offset + limit;
    fetchData(newOffset, limit);
  };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Clicks Analytics</CardTitle>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <input
              placeholder="PUB ID"
              value={pubId}
              onChange={(e) => setPubId(e.target.value)}
              className="border rounded p-2"
            />
            <input
              placeholder="Offer ID"
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="border rounded p-2"
            />
            <input
              placeholder="GEO"
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="border rounded p-2"
            />
            <input
              placeholder="Carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="border rounded p-2"
            />
            <input
              placeholder="Search IP / UA"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border rounded p-2"
            />

            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded p-2"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded p-2"
            />

            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="border rounded p-2"
            >
              <option value="none">No Group</option>
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
            </select>

            <button
              onClick={onApply}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Apply
            </button>

            <button
              onClick={() => {
                setPubId("");
                setOfferId("");
                setGeo("");
                setCarrier("");
                setQ("");
                setFrom("");
                setTo("");
                setGroup("none");
                fetchData(0, limit);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Reset
            </button>

            <button
              onClick={exportCsv}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Export CSV
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Metric card */}
          <div style={{ display: "flex", textAlign: "center", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12 }}>Total Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{total}</div>
            </div>
          </div>

          {/* Chart */}
          {group !== "none" && chartData.length > 0 && (
            <div className="mb-6" style={{ height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
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
                  <tr>
                    <td colSpan={11} style={tdStyle}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={tdStyle}>
                      No Data
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const params = r.params || {};
                    const clickId =
                      params.click_id ||
                      params.cid ||
                      params.clickID ||
                      "{click_id}";

                    return (
                      <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                        <td style={tdStyle}>
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td style={tdStyle}>{r.pub_id}</td>
                        <td style={tdStyle}>{r.publisher_name || "-"}</td>
                        <td style={tdStyle}>{r.offer_code || r.offer_id}</td>
                        <td style={tdStyle}>{r.offer_name || "-"}</td>
                        <td style={tdStyle}>{r.advertiser_name || "-"}</td>
                        <td style={tdStyle}>{r.ip}</td>
                        <td style={tdStyle}>{clickId}</td>
                        <td style={tdStyle}>{r.geo}</td>
                        <td style={tdStyle}>{r.carrier}</td>
                        <td
                          style={{
                            ...tdStyle,
                            maxWidth: 300,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={r.ua}
                        >
                          {r.ua}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}
          >
            <div>
              <button
                onClick={handlePrev}
                className="border rounded px-3 py-1 mr-2"
              >
                Prev
              </button>

              <button onClick={handleNext} className="border rounded px-3 py-1">
                Next
              </button>
            </div>

            <div>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  fetchData(0, newLimit);
                }}
                className="border rounded p-2"
              >
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
