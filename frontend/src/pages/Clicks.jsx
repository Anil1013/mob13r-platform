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

export default function ClicksPage() {
  // ---------- State ----------
  const [rows, setRows] = useState([]);
  const [series, setSeries] = useState([]);
  const [group, setGroup] = useState("none");
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);

  const [pubId, setPubId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const API = "/analytics/clicks";

  // ---------- Fetch ----------
  const fetchData = async (opts = {}) => {
    try {
      setLoading(true);

      let fromVal = opts.from ?? from;
      let toVal = opts.to ?? to;

      // if user cleared dates, fallback to today
      if (!fromVal && !toVal) {
        fromVal = todayStr;
        toVal = todayStr;
      } else if (fromVal && !toVal) {
        toVal = fromVal;
      } else if (!fromVal && toVal) {
        fromVal = toVal;
      }

      // update state so inputs show actual range used
      setFrom(fromVal);
      setTo(toVal);

      const params = {
        pub_id: pubId || undefined,
        offer_id: offerId || undefined,
        geo: geo || undefined,
        carrier: carrier || undefined,
        q: q || undefined,
        from: fromVal,
        to: toVal,
        group,
        limit,
        offset,
      };

      const { data } = await apiClient.get(API, { params });

      setRows(data.rows || []);
      setTotal(data.total || 0);
      setSeries(data.series || []);
    } catch (err) {
      console.error("fetchData error", err);
      alert("Failed to fetch clicks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = () => {
    setOffset(0);
    fetchData({ from, to });
  };

  // ---------- CSV Export ----------
  const exportCsv = async () => {
    try {
      let fromVal = from;
      let toVal = to;

      if (!fromVal && !toVal) {
        fromVal = todayStr;
        toVal = todayStr;
      } else if (fromVal && !toVal) {
        toVal = fromVal;
      } else if (!fromVal && toVal) {
        fromVal = toVal;
      }

      const params = {
        pub_id: pubId || undefined,
        offer_id: offerId || undefined,
        geo: geo || undefined,
        carrier: carrier || undefined,
        q: q || undefined,
        from: fromVal,
        to: toVal,
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

  // ---------- Helpers ----------
  const thStyle = {
    textAlign: "center",
    padding: "10px 6px",
    background: "#f3f4f6",
    whiteSpace: "nowrap",
  };
  const tdStyle = { textAlign: "center", padding: "10px 6px" };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  // ---------- Render ----------
  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Clicks Analytics</CardTitle>

          {/* Filters */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <input
              placeholder="PUB (e.g. PUB03)"
              value={pubId}
              onChange={(e) => setPubId(e.target.value.toUpperCase())}
              className="border rounded p-2"
            />
            <input
              placeholder="OFFER ID"
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="border rounded p-2"
            />
            <input
              placeholder="GEO (IN)"
              value={geo}
              onChange={(e) => setGeo(e.target.value.toUpperCase())}
              className="border rounded p-2"
            />
            <input
              placeholder="Carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
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

            <input
              placeholder="Search IP / UA / params"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border rounded p-2 min-w-[200px]"
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
              onClick={exportCsv}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Export CSV
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Top Stats */}
          <div
            style={{
              display: "flex",
              textAlign: "center",
              marginBottom: 20,
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12 }}>Total Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{total}</div>
            </div>
          </div>

          {/* Time-series Chart */}
          {(group === "hour" || group === "day") && (
            <div className="mb-6" style={{ height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#4F46E5"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              className="w-full border-collapse"
              style={{ minWidth: 1300 }}
            >
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
                      params.clickid ||
                      "-";

                    return (
                      <tr
                        key={r.id}
                        style={{ borderTop: "1px solid #e5e7eb" }}
                      >
                        <td style={tdStyle}>
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td style={tdStyle}>{r.pub_id}</td>
                        <td style={tdStyle}>{r.publisher_name || "-"}</td>
                        <td style={tdStyle}>{r.offer_id}</td>
                        <td style={tdStyle}>{r.offer_name || "-"}</td>
                        <td style={tdStyle}>{r.advertiser_name || "-"}</td>
                        <td style={tdStyle}>{r.ip}</td>
                        <td style={tdStyle}>{clickId}</td>
                        <td style={tdStyle}>{r.geo}</td>
                        <td style={tdStyle}>{r.carrier}</td>
                        <td
                          style={{
                            ...tdStyle,
                            maxWidth: 350,
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
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 16,
              alignItems: "center",
            }}
          >
            <div>
              <button
                onClick={() => {
                  const newOffset = Math.max(0, offset - limit);
                  setOffset(newOffset);
                  fetchData({ from, to, offset: newOffset });
                }}
                disabled={offset === 0}
                className="border rounded px-3 py-1 mr-2 disabled:opacity-50"
              >
                Prev
              </button>

              <button
                onClick={() => {
                  const newOffset = offset + limit;
                  setOffset(newOffset);
                  fetchData({ from, to, offset: newOffset });
                }}
                disabled={currentPage >= totalPages}
                className="border rounded px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>

              <span className="ml-3 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <div>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setOffset(0);
                  fetchData({ from, to, offset: 0 });
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
