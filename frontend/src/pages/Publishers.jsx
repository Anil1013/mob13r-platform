import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({
    id: null, advertiser_id: "", name: "", type: "CPA", payout: 0,
    tracking_url: "", landing_url: "", cap_daily: "", cap_total: "", status: "active",
    targets: [] // {geo, carrier}
  });

  const fetchOffers = async () => {
    try {
      const res = await apiClient.get("/offers");
      setOffers(res.data || []);
    } catch (err) {
      alert("Failed to fetch offers");
      console.error(err);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const addTarget = () => setForm({ ...form, targets: [...form.targets, { geo: "", carrier: "" }] });
  const updateTarget = (i, key, val) => {
    const newTargets = [...form.targets]; newTargets[i][key] = val; setForm({ ...form, targets: newTargets });
  };
  const removeTarget = (i) => { const t = [...form.targets]; t.splice(i,1); setForm({...form, targets:t}); };

  const save = async () => {
    try {
      // basic validation
      if (!form.advertiser_id || !form.name) return alert("Advertiser & name required");
      const payload = {
        advertiser_id: form.advertiser_id,
        name: form.name,
        type: form.type,
        payout: Number(form.payout),
        tracking_url: form.tracking_url,
        landing_url: form.landing_url,
        cap_daily: form.cap_daily || null,
        cap_total: form.cap_total || null,
        status: form.status,
        targets: form.targets
      };
      if (form.id) {
        await apiClient.put(`/offers/${form.id}`, payload);
        alert("Offer updated");
      } else {
        await apiClient.post("/offers", payload);
        alert("Offer created");
      }
      setForm({ id:null, advertiser_id:"", name:"", type:"CPA", payout:0, tracking_url:"", landing_url:"", cap_daily:"", cap_total:"", status:"active", targets:[]});
      fetchOffers();
    } catch (err) {
      console.error(err);
      alert("Error saving offer");
    }
  };

  const edit = (o) => {
    setForm({
      id: o.id,
      advertiser_id: o.advertiser_id,
      name: o.name,
      type: o.type,
      payout: o.payout,
      tracking_url: o.tracking_url,
      landing_url: o.landing_url,
      cap_daily: o.cap_daily,
      cap_total: o.cap_total,
      status: o.status,
      targets: [] // fetch targets separately if needed
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-3">Offers</h1>
      <div className="grid grid-cols-3 gap-2">
        <input placeholder="Advertiser ID" value={form.advertiser_id} onChange={e=>setForm({...form, advertiser_id:e.target.value})} />
        <input placeholder="Offer name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
          <option>CPA</option><option>CPI</option><option>CPL</option><option>CPS</option><option>INAPP</option>
        </select>
        <input placeholder="Payout" value={form.payout} onChange={e=>setForm({...form,payout:e.target.value})} />
        <input placeholder="Tracking URL template" value={form.tracking_url} onChange={e=>setForm({...form,tracking_url:e.target.value})} />
        <input placeholder="Landing URL" value={form.landing_url} onChange={e=>setForm({...form,landing_url:e.target.value})} />
        <input placeholder="cap_daily" value={form.cap_daily} onChange={e=>setForm({...form,cap_daily:e.target.value})} />
        <input placeholder="cap_total" value={form.cap_total} onChange={e=>setForm({...form,cap_total:e.target.value})} />
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>active</option><option>inactive</option></select>
      </div>

      <div className="mt-2">
        <h3>Targets (geo/carrier)</h3>
        {form.targets.map((t,i) => (
          <div key={i} className="flex gap-2">
            <input placeholder="geo (IQ)" value={t.geo} onChange={e=>updateTarget(i,'geo',e.target.value)} />
            <input placeholder="carrier (Zain IQ)" value={t.carrier} onChange={e=>updateTarget(i,'carrier',e.target.value)} />
            <button onClick={()=>removeTarget(i)}>Remove</button>
          </div>
        ))}
        <button onClick={addTarget}>Add target</button>
      </div>

      <div className="mt-3">
        <button onClick={save} className="bg-blue-600 text-white px-4 py-1 rounded">Save Offer</button>
      </div>

      <hr className="my-4" />
      <h2 className="font-bold">Existing Offers</h2>
      <table className="min-w-full">
        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Payout</th><th>cap_daily</th><th>cap_total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {offers.map(o => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.name}</td>
              <td>{o.type}</td>
              <td>{o.payout}</td>
              <td>{o.cap_daily}</td>
              <td>{o.cap_total}</td>
              <td>{o.status}</td>
              <td><button onClick={()=>edit(o)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
