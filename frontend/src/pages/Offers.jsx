import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    advertiser_id: "",
    payout: "",
    url: "",
    status: "active"
  });

  const fetchOffers = async () => {
    const res = await apiClient.get("/offers");
    setOffers(res.data);
  };

  const createOffer = async () => {
    await apiClient.post("/offers", form);
    setForm({ name: "", advertiser_id: "", payout: "", url: "", status: "active" });
    fetchOffers();
  };

  useEffect(() => { fetchOffers(); }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Offers</h2>

      <div className="flex gap-2 mb-4">
        <input placeholder="Name" className="input" 
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Advertiser ID" className="input"
          value={form.advertiser_id} onChange={e => setForm({ ...form, advertiser_id: e.target.value })} />
        <input placeholder="Payout" className="input"
          value={form.payout} onChange={e => setForm({ ...form, payout: e.target.value })} />
        <input placeholder="URL" className="input"
          value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />

        <button className="btn btn-primary" onClick={createOffer}>Add Offer</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Advertiser</th>
            <th>Payout</th>
            <th>URL</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {offers.map(o => (
            <tr key={o.id}>
              <td>{o.name}</td>
              <td>{o.advertiser_id}</td>
              <td>${o.payout}</td>
              <td>{o.url}</td>
              <td>{o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
