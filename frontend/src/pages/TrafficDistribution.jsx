// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [publishers, setPublishers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [filter, setFilter] = useState({ pub_id: "", geo: "", carrier: "" });

  const [form, setForm] = useState({
    id: null,
    pub_id: "",
    geo: "",
    carrier: "",
    offer_id: "",
    percentage: 10,
    sequence_order: 0,
  });

  const fetchAll = async () => {
    try {
      const [pubR, offR, distR] = await Promise.all([
        apiClient.get("/publishers"),
        apiClient.get("/offers"),
        apiClient.get("/distribution"),
      ]);
      setPublishers(pubR.data || []);
      setOffers(offR.data || []);
      setDistributions(distR.data || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load data");
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const save = async () => {
    try {
      const payload = {
        pub_id: form.pub_id,
        geo: form.geo,
        carrier: form.carrier,
        offer_id: form.offer_id,
        percentage: Number(form.percentage),
        sequence_order: Number(form.sequence_order || 0),
      };

      if (!payload.pub_id || !payload.geo || !payload.carrier || !payload.offer_id) {
        return alert("Select publisher, geo, carrier and offer");
      }

      if (form.id) {
        await apiClient.put(`/distribution/${form.id}`, payload);
        alert("Updated");
      } else {
        await apiClient.post("/distribution", payload);
        alert("Added");
      }
      setForm({ id:null, pub_id:"", geo:"", carrier:"", offer_id:"", percentage:10, sequence_order:0 });
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const edit = (d) => {
    setForm({
      id: d.id,
      pub_id: d.pub_id,
      geo: d.geo,
      carrier: d.carrier,
      offer_id: d.offer_id,
      percentage: d.percentage,
      sequence_order: d.sequence_order || 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    if (!window.confirm("Remove distribution row?")) return;
    await apiClient.delete(`/distribution/${id}`);
    fetchAll();
  };

  // grouped view for UI like example structure
  const grouped = distributions.reduce((acc, r) => {
    const key = `${r.pub_id}::${r.geo}::${r.carrier}`;
    if (!acc[key]) acc[key] = { pub_id: r.pub_id, geo: r.geo, carrier: r.carrier, rows: [] };
    acc[key].rows.push(r);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traffic Distribution</h2>

      {/* form */}
      <div className="mb-4 grid grid-cols-6 gap-2">
        <select className="border p-2 rounded" value={form.pub_id} onChange={e=>setForm({...form,pub_id:e.target.value})}>
          <option value="">Select Publisher</option>
          {publishers.map(p => <option key={p.id} value={p.id}>{p.name} (PUB{p.id})</option>)}
        </select>
        <input placeholder="Geo (IQ)" className="border p-2 rounded" value={form.geo} onChange={e=>setForm({...form,geo:e.target.value})} />
        <input placeholder="Carrier" className="border p-2 rounded" value={form.carrier} onChange={e=>setForm({...form,carrier:e.target.value})} />
        <select className="border p-2 rounded" value={form.offer_id} onChange={e=>setForm({...form,offer_id:e.target.value})}>
          <option value="">Select Offer</option>
          {offers.map(o => <option key={o.offer_id} value={o.offer_id}>{o.offer_id} - {o.name} ({o.advertiser_name||o.advertiser})</option>)}
        </select>
        <input className="border p-2 rounded" type="number" min="1" max="100" placeholder="Percentage" value={form.percentage} onChange={e=>setForm({...form,percentage:e.target.value})} />
        <input className="border p-2 rounded" type="number" placeholder="Order" value={form.sequence_order} onChange={e=>setForm({...form,sequence_order:e.target.value})} />
      </div>

      <div className="mb-4">
        <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">{form.id ? "Update" : "Add"}</button>
        {form.id && <button onClick={()=>{setForm({id:null,pub_id:"",geo:"",carrier:"",offer_id:"",percentage:10,sequence_order:0})}} className="ml-2 bg-gray-400 text-white px-3 py-2 rounded">Cancel</button>}
      </div>

      <div className="mb-3">
        <input placeholder="Search publisher/geo/carrier..." className="border p-2 rounded w-1/3" value={filter.pub_id} onChange={e => setFilter({...filter, pub_id: e.target.value})} />
      </div>

      {/* grouped render */}
      <div className="space-y-6">
        {Object.values(grouped).map(g => (
          <div key={g.pub_id + g.geo + g.carrier} className="border p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <div>
                <strong>PUB{g.pub_id}</strong> — Publisher: {publishers.find(p=>p.id===g.pub_id)?.name || "N/A"} &nbsp;
                <span className="ml-3">Geo: {g.geo} / Carrier: {g.carrier}</span>
              </div>
            </div>

            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Offer ID</th>
                  <th className="p-2">Advertiser</th>
                  <th className="p-2">Offer Name</th>
                  <th className="p-2">Percentage</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-mono">{r.offer_id}</td>
                    <td className="p-2">{r.advertiser_name || "-"}</td>
                    <td className="p-2">{r.offer_name || "-"}</td>
                    <td className="p-2">{r.percentage}%</td>
                    <td className="p-2 flex gap-2">
                      <button onClick={()=>edit(r)} className="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
                      <button onClick={()=>remove(r.id)} className="bg-red-600 text-white px-2 py-1 rounded">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        ))}
      </div>
    </div>
  );
}
