import React, { useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pub, setPub] = useState("");
  const [publisher, setPublisher] = useState(null);
  const [offers, setOffers] = useState([]);
  const [rules, setRules] = useState([]);

  const [selectedOffer, setSelectedOffer] = useState("");
  const [weight, setWeight] = useState(100);

  const loadConfig = async () => {
    try {
      const meta = await apiClient.get(`/distribution/meta?pub_id=${pub}`);
      setPublisher(meta.data.publisher);

      const rulesRes = await apiClient.get(`/distribution/rules?pub_id=${pub}`);
      setRules(rulesRes.data);

      setOffers(meta.data.offers);
    } catch (e) {
      alert("❌ Publisher not found or config missing");
    }
  };

  const addRule = async () => {
    if (!selectedOffer) return alert("Select Offer!");

    const offer = offers.find((o) => o.offer_id === selectedOffer);

    await apiClient.post("/distribution/add", {
      pub_id: pub,
      publisher_name: publisher.publisher_name,
      name: publisher.name, // OFFER NAME OF TRACKING
      geo: publisher.geo,
      carrier: publisher.carrier,
      offer_id: offer.offer_id,
      offer_name: offer.offer_name,
      advertiser: offer.advertiser,
      weight,
    });

    loadConfig();
  };

  const deleteRule = async (id) => {
    await apiClient.delete(`/distribution/delete/${id}`);
    loadConfig();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traffic Distribution</h2>

      {/* Search PUB */}
      <div className="flex gap-3 mb-4">
        <input
          value={pub}
          onChange={(e) => setPub(e.target.value)}
          placeholder="PUB01"
          className="border p-2 rounded w-40"
        />
        <button
          onClick={loadConfig}
          className="px-4 py-2 bg-blue-600 rounded text-white"
        >
          Load Config
        </button>
      </div>

      {/* Publisher Details */}
      {publisher && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold text-lg mb-2">Publisher Details</h3>

          <div><b>PUB_ID:</b> {pub}</div>
          <div><b>Publisher:</b> {publisher.publisher_name}</div>
          <div><b>Name:</b> {publisher.name}</div>
          <div><b>Geo:</b> {publisher.geo}</div>
          <div><b>Carrier:</b> {publisher.carrier}</div>
        </div>
      )}

      {/* Select Offer */}
      {publisher && (
        <div className="p-4 border rounded mb-6">
          <h3 className="font-semibold mb-3">Select Offer for Distribution</h3>

          <div className="flex gap-4 items-center">

            <select
              value={selectedOffer}
              onChange={(e) => setSelectedOffer(e.target.value)}
              className="border p-2 rounded w-72"
            >
              <option value="">Select Offer</option>
              {offers.map((o) => (
                <option key={o.offer_id} value={o.offer_id}>
                  {o.offer_id} – {o.offer_name} – {o.advertiser}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="border p-2 rounded w-24"
            />

            <button
              onClick={addRule}
              className="bg-green-600 px-4 py-2 rounded text-white"
            >
              Add Rule
            </button>
          </div>
        </div>
      )}

      {/* Rules Table EXACT LIKE EXCEL */}
      <h3 className="text-xl font-bold mb-3">Active Rules</h3>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-2">PUB_ID</th>
            <th className="p-2">Publisher</th>
            <th className="p-2">Name</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Offer ID</th>
            <th className="p-2">Advertiser</th>
            <th className="p-2">Offer Name</th>
            <th className="p-2">Traffic %</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.pub_id}</td>
              <td className="p-2">{r.publisher_name}</td>
              <td className="p-2">{publisher?.name}</td>
              <td className="p-2">{r.carrier}</td>
              <td className="p-2">{r.geo}</td>
              <td className="p-2 text-blue-600">{r.offer_id}</td>
              <td className="p-2">{r.advertiser}</td>
              <td className="p-2">{r.offer_name}</td>
              <td className="p-2">{r.weight}%</td>

              <td className="p-2">
                <button
                  onClick={() => deleteRule(r.id)}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
