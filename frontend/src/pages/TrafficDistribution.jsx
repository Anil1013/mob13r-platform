import React, { useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [meta, setMeta] = useState([]);
  const [publisherName, setPublisherName] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [offers, setOffers] = useState([]);
  const [rules, setRules] = useState([]);

  const [selectedCombo, setSelectedCombo] = useState("");
  const [selectedOffer, setSelectedOffer] = useState("");
  const [weight, setWeight] = useState(100);

  const loadMeta = async () => {
    try {
      const res = await apiClient.get(`/distribution/meta?pub_id=${pubId}`);
      const m = res.data;

      setMeta(m);
      setPublisherName(m[0]?.publisher_name || "");
      setPublisherId(m[0]?.publisher_id || "");

      loadOffers();
      loadRules();
    } catch (err) {
      console.error("meta fetch failed", err);
      alert("Meta fetch failed");
    }
  };

  const loadOffers = async () => {
    try {
      const res = await apiClient.get(`/distribution/offers`);
      setOffers(res.data || []);
    } catch (err) {
      console.error("offers fetch failed", err);
      alert("Offers fetch failed");
    }
  };

  const loadRules = async () => {
    try {
      const res = await apiClient.get(`/distribution/rules?pub_id=${pubId}`);
      setRules(res.data || []);
    } catch (err) {
      console.error("rules fetch failed", err);
      alert("Rules fetch failed");
    }
  };

  const addRule = async () => {
    if (!selectedCombo) return alert("Select tracking link");
    if (!selectedOffer) return alert("Select an offer");

    const combo = meta.find((c) => c.id === Number(selectedCombo));
    const offer = offers.find((o) => o.id === Number(selectedOffer));

    const payload = {
      pub_id: pubId,
      publisher_id: publisherId,
      publisher_name: publisherName,
      tracking_link_id: combo.id,
      geo: combo.geo,
      carrier: combo.carrier,
      offer_id: offer.id,
      offer_code: offer.offer_id,
      offer_name: offer.name,
      advertiser_name: offer.advertiser_name,
      redirect_url: offer.tracking_url,
      type: offer.type,
      weight: Number(weight),
    };

    try {
      await apiClient.post(`/distribution/rules`, payload);
      loadRules();
    } catch (err) {
      console.error("Add rule failed", err);
      alert("Failed to add rule");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traffic Distribution</h2>

      <div className="flex gap-3 mb-4">
        <input
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          className="border p-2 rounded"
          placeholder="PUB01"
        />
        <button
          onClick={loadMeta}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load Config
        </button>
      </div>

      {publisherName && (
        <div className="mb-4">
          <p><b>PUB ID:</b> {pubId}</p>
          <p><b>Publisher ID:</b> {publisherId}</p>
          <p><b>Publisher Name:</b> {publisherName}</p>
        </div>
      )}

      {/* Combos Dropdown */}
      <div className="mb-4">
        <label>Tracking Link (publisher):</label>
        <select
          value={selectedCombo}
          onChange={(e) => setSelectedCombo(e.target.value)}
          className="border p-2 rounded ml-2"
        >
          <option value="">Select Combo</option>
          {meta.map((m) => (
            <option key={m.id} value={m.id}>
              {pubId} • {m.geo}/{m.carrier} • {m.type}
            </option>
          ))}
        </select>
      </div>

      {/* Offers Dropdown */}
      <div className="mb-4">
        <label>Offer:</label>
        <select
          value={selectedOffer}
          onChange={(e) => setSelectedOffer(e.target.value)}
          className="border p-2 rounded ml-2"
        >
          <option value="">Select Offer</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.offer_id} • {o.name} • {o.advertiser_name}
            </option>
          ))}
        </select>

        <label className="ml-4">Weight (%):</label>
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="border p-2 rounded ml-2 w-24"
        />

        <button
          onClick={addRule}
          className="bg-green-600 text-white px-4 py-2 rounded ml-4"
        >
          Add Rule
        </button>
      </div>

      {/* Rules Table */}
      <h3 className="text-xl font-bold mb-2">Active Rules</h3>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Offer Code</th>
            <th className="p-2">Advertiser</th>
            <th className="p-2">Offer Name</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Weight</th>
            <th className="p-2">Type</th>
            <th className="p-2">Redirect URL</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.offer_code}</td>
              <td className="p-2">{r.advertiser_name}</td>
              <td className="p-2">{r.offer_name}</td>
              <td className="p-2">{r.geo}</td>
              <td className="p-2">{r.carrier}</td>
              <td className="p-2">{r.weight}%</td>
              <td className="p-2">{r.type}</td>
              <td className="p-2">{r.redirect_url}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
