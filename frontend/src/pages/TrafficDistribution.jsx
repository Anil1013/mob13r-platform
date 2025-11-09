// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [rows, setRows] = useState([]); // distribution rows for selected link
  const [form, setForm] = useState({
    offer_id: "",
    percentage: 0,
    is_fallback: false,
    status: "active",
  });

  // load tracking links and offers
  const fetchInitial = async () => {
    try {
      const [tRes, oRes] = await Promise.all([
        apiClient.get("/tracking"), // your tracking links endpoint
        apiClient.get("/offers"),   // returns offers list
      ]);
      setTrackingLinks(tRes.data || []);
      setOffers(oRes.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load initial data");
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  // load distribution rows for selected tracking link
  const loadRows = async (link) => {
    if (!link) return;
    setSelectedLink(link);
    try {
      const res = await apiClient.get("/traffic-distribution", { params: { tracking_link_id: link.id }});
      setRows(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load distribution rows");
    }
  };

  // add new distribution row
  const addRow = async () => {
    if (!selectedLink) return alert("Select a tracking link first");
    if (!form.offer_id) return alert("Select offer");
    const payload = {
      tracking_link_id: selectedLink.id,
      pub_id: selectedLink.publisher_id,
      pub_code: selectedLink.publisher_id ? `PUB${selectedLink.publisher_id}` : null,
      offer_id: form.offer_id,
      geo: selectedLink.geo,
      carrier: selectedLink.carrier,
      percentage: Number(form.percentage),
      is_fallback: !!form.is_fallback,
      status: form.status,
    };

    try {
      await apiClient.post("/traffic-distribution", payload);
      alert("Added");
      setForm({ offer_id: "", percentage: 0, is_fallback: false, status: "active" });
      loadRows(selectedLink);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // edit a row
  const startEdit = (r) => {
    setForm({
      offer_id: r.offer_id,
      percentage: r.percentage,
      is_fallback: r.is_fallback,
      status: r.status,
      editingId: r.id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveEdit = async () => {
    const id = form.editingId;
    if (!id) return alert("No editing id");
    try {
      await apiClient.put(`/traffic-distribution/${id}`, {
        percentage: Number(form.percentage),
        is_fallback: !!form.is_fallback,
        status: form.status,
        offer_id: form.offer_id,
      });
      alert("Updated");
      setForm({ offer_id: "", percentage: 0, is_fallback: false, status: "active" });
      loadRows(selectedLink);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // remove a row
  const removeRow = async (id) => {
    if (!window.confirm("Remove this distribution row?")) return;
    try {
      await apiClient.delete(`/traffic-distribution/${id}`);
      alert("Removed");
      loadRows(selectedLink);
    } catch (err) {
      alert("Failed to remove");
    }
  };

  // convenience: compute current total percentage for active rows
  const totalActivePercent = rows.reduce((s, r) => (r.status === "active" ? s + (r.percentage || 0) : s), 0);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Traffic Distribution (per tracking link)</h2>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Choose Tracking Link</label>
        <select
          className="border p-2 rounded w-1/3"
          value={selectedLink?.id || ""}
          onChange={(e) => {
            const id = e.target.value;
            const link = trackingLinks.find((t) => `${t.id}` === `${id}`);
            loadRows(link);
          }}
        >
          <option value="">-- select tracking link --</option>
          {trackingLinks.map((t) => (
            <option key={t.id} value={t.id}>
              {`PUB${t.publisher_id} — ${t.publisher_name} — ${t.geo}/${t.carrier} — ${t.name}`}
            </option>
          ))}
        </select>
      </div>

      {/* Add/Edit form */}
      <div className="grid grid-cols-6 gap-2 items-end mb-4">
        <div>
          <label className="block text-sm">Offer</label>
          <select className="border p-2 rounded" value={form.offer_id} onChange={(e)=>setForm({...form, offer_id: e.target.value})}>
            <option value="">-- select --</option>
            {offers.map((o) => (
              <option key={o.offer_id} value={o.offer_id}>{`${o.offer_id} — ${o.name}`}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm">Percentage</label>
          <input type="number" min="0" max="100" className="border p-2 rounded w-28"
            value={form.percentage} onChange={(e)=>setForm({...form, percentage: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm">Fallback</label>
          <input type="checkbox" checked={form.is_fallback || false} onChange={(e)=>setForm({...form, is_fallback: e.target.checked})} />
        </div>

        <div>
          <label className="block text-sm">Status</label>
          <select value={form.status} onChange={(e)=>setForm({...form, status: e.target.value})} className="border p-2 rounded">
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="inactive">inactive</option>
          </select>
        </div>

        <div>
          {form.editingId ? (
            <>
              <button onClick={saveEdit} className="bg-yellow-500 text-white px-3 py-2 rounded mr-2">Save</button>
              <button onClick={() => { setForm({offer_id:"",percentage:0,is_fallback:false,status:"active"}); }} className="bg-gray-400 text-white px-3 py-2 rounded">Cancel</button>
            </>
          ) : (
            <button onClick={addRow} className="bg-green-600 text-white px-3 py-2 rounded">Add</button>
          )}
        </div>

        <div className="text-sm">
          <div>Active % used: <strong>{totalActivePercent}%</strong></div>
          <div className="text-xs text-gray-500">Max 100% — at most 5 active offers per tracking link</div>
        </div>
      </div>

      {/* Rows list */}
      <div className="mt-4">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Offer</th>
              <th className="p-2">Geo / Carrier</th>
              <th className="p-2">Pct</th>
              <th className="p-2">Fallback</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.id} className="border-t">
                <td className="p-2">{i+1}</td>
                <td className="p-2">{r.offer_id}</td>
                <td className="p-2">{r.geo} / {r.carrier}</td>
                <td className="p-2">{r.percentage}%</td>
                <td className="p-2">{r.is_fallback ? "Yes" : "No"}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 flex gap-2">
                  <button className="bg-yellow-500 text-white px-2 py-1 rounded" onClick={()=>startEdit(r)}>Edit</button>
                  <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={()=>removeRow(r.id)}>Remove</button>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={7} className="p-3 text-center text-gray-500">No distribution rows</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
