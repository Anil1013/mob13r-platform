// frontend/src/pages/Clicks.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx"; // relative path to your card
import { format } from "date-fns";

export default function ClicksPage() {
  const [rows, setRows] = useState([]);
  const [group, setGroup] = useState("none");
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pubId, setPubId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const API = "/api/analytics/clicks";

  const fetchData = async () => {
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
        limit,
        offset
      };
      const { data } = await axios.get(API, { params });
      setRows(data.rows || []);
      setTotal(data.count ?? (data.rows ? data.rows.length : 0));
    } catch (err) {
      console.error("fetchData error", err);
      alert("Failed to fetch clicks. See console.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  const onApply = () => {
    setOffset(0);
    fetchData();
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
        limit,
        offset,
        format: "csv",
      };

      const resp = await axios.get(API, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([resp.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = `clicks-${group}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportCsv error", err);
      alert("Failed to export CSV. See console.");
    }
  };

  // Simple centered cell style
  const thStyle = { textAlign: "center", verticalAlign: "middle" };
  const tdStyle = { textAlign: "center", verticalAlign: "middle", padding: "10px 8px" };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <div style={{display: "flex", justifyContent: "space-between", alignItems:"center", gap:12}}>
            <CardTitle style={{margin:0}}>Clicks Analytics</CardTitle>

            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <input placeholder="PUB (PUB03 or id)" value={pubId} onChange={e=>setPubId(e.target.value)} className="border rounded p-2" />
              <input placeholder="OFFER (OFF02 or id)" value={offerId} onChange={e=>setOfferId(e.target.value)} className="border rounded p-2" />
              <input placeholder="GEO (IN)" value={geo} onChange={e=>setGeo(e.target.value)} className="border rounded p-2" />
              <input placeholder="Carrier" value={carrier} onChange={e=>setCarrier(e.target.value)} className="border rounded p-2" />
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded p-2" />
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded p-2" />
              <select value={group} onChange={e=>setGroup(e.target.value)} className="border rounded p-2">
                <option value="none">No group</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
              </select>
              <button onClick={onApply} className="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>
              <button onClick={exportCsv} className="bg-black text-white px-4 py-2 rounded">Export CSV</button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{display:"flex", gap:12, marginBottom:12}}>
            <div style={{flex:1, textAlign:"center"}}>
              <div style={{fontSize:12}}>Total Clicks</div>
              <div style={{fontSize:28, fontWeight:700}}>{total}</div>
            </div>
            <div style={{flex:1, textAlign:"center"}}>
              <div style={{fontSize:12}}>Top Publisher</div>
              <div style={{fontSize:20, fontWeight:600}}>—</div>
            </div>
            <div style={{flex:1, textAlign:"center"}}>
              <div style={{fontSize:12}}>Top Offer</div>
              <div style={{fontSize:20, fontWeight:600}}>—</div>
            </div>
            <div style={{flex:1, textAlign:"center"}}>
              <div style={{fontSize:12}}>Group</div>
              <div style={{fontSize:20, fontWeight:600}}>{group}</div>
            </div>
          </div>

          <div style={{overflowX:"auto"}}>
            <table className="w-full border-collapse" style={{minWidth:1100}}>
              <thead>
                <tr style={{background:"#f3f4f6"}}>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>PUB (code / id)</th>
                  <th style={thStyle}>Publisher Name</th>
                  <th style={thStyle}>Tracking Link</th>
                  <th style={thStyle}>Offer (id / code)</th>
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
                  <tr><td colSpan={12} style={{padding:20, textAlign:"center"}}>Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={12} style={{padding:20, textAlign:"center"}}>No rows</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id || `${r.bucket || ""}-${Math.random()}`} style={{borderTop:"1px solid #eee"}}>
                      <td style={tdStyle}>
                        {r.created_at ? new Date(r.created_at).toLocaleString() : (r.bucket ? new Date(r.bucket).toLocaleString() : "")}
                      </td>
                      <td style={tdStyle}>{r.pub_code ?? r.publisher_id ?? ""}</td>
                      <td style={tdStyle}>{r.publisher_name ?? ""}</td>
                      <td style={tdStyle}>{r.tracking_link_id ?? ""}</td>
                      <td style={tdStyle}>{r.offer_id ?? r.offer_code ?? ""}</td>
                      <td style={tdStyle}>{r.offer_name ?? ""}</td>
                      <td style={tdStyle}>{r.advertiser_name ?? ""}</td>
                      <td style={tdStyle}>{r.ip ?? ""}</td>
                      <td style={tdStyle}>{r.click_id ?? ""}</td>
                      <td style={tdStyle}>{r.geo ?? ""}</td>
                      <td style={tdStyle}>{r.carrier ?? ""}</td>
                      <td style={tdStyle}><div style={{maxWidth:300, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:"0 auto"}}>{r.ua ?? ""}</div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12}}>
            <div>
              <button onClick={() => { setOffset(Math.max(0, offset - limit)); fetchData(); }} className="border rounded px-3 py-1 mr-2">Prev</button>
              <button onClick={() => { setOffset(offset + limit); fetchData(); }} className="border rounded px-3 py-1">Next</button>
            </div>

            <div>
              <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="border rounded p-2">
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
