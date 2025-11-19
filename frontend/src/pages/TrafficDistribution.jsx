import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [meta, setMeta] = useState(null);
  const [offers, setOffers] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState("");
  const [weight, setWeight] = useState(100);
  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------
     Load Meta: Publisher, GEO, Carrier, Offers
  --------------------------------------------- */
  const loadMeta = async (pub) => {
    try {
      setLoading(true);

      const res = await apiClient.get(`/distribution/meta?pub_id=${pub}`);
      setMeta(res.data);
      setOffers(res.data.offers || []);

      // Load existing rules
      const rulesRes = await apiClient.get(`/distribution?pub_id=${pub}`);
      setRules(rulesRes.data || []);
    } catch (err) {
      console.error("meta fetch failed", err);
      alert("❌ No data found for this PUB_ID");
      setMeta(null);
      setOffers([]);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------
     Save a new traffic rule
  --------------------------------------------- */
  const saveRule = async () => {
    if (!selectedOffer) return alert("Select an offer first");

    try {
      await apiClient.post("/distribution", {
        pub_id: pubId,
        publisher_id: meta.publisher_id,
        tracking_id: selectedOffer,
        weight,
      });

      alert("✅ Rule added successfully!");
      loadMeta(pubId);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save rule");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traffic Distribution</h2>

      {/* PUB ID Input */}
      <div className="mb-5 flex gap-3">
        <input
          type="text"
          placeholder="Enter PUB_ID (e.g. PUB01)"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          className="border p-3 rounded w-64"
        />
        <button
          onClick={() => loadMeta(pubId)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load Config
        </button>
      </div>

      {/* LOADING */}
      {loading && <p className="text-gray-600">Loading...</p>}

      {/* META INFO */}
      {meta && (
        <div className="p-4 bg-gray-100 rounded mb-6">
          <h3 className="font-semibold mb-2">Publisher Details</h3>

          <p><strong>PUB_ID:</strong> {meta.pub_id}</p>
          <p><strong>Publisher ID:</strong> {meta.publisher_id}</p>
          <p><strong>Geo:</strong> {meta.geo}</p>
          <p><strong>Carrier:</strong> {meta.carrier}</p>
        </div>
      )}

      {/* OFFER SELECTION */}
      {offers.length > 0 && (
        <div className="p-4 bg-white rounded shadow mb-6">
          <h3 className="font-semibold mb-3">Select Offer for Distribution</h3>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <select
              value={selectedOffer}
              onChange={(e) => setSelectedOffer(e.target.value)}
              className="border p-3 rounded"
            >
              <option value="">Select Offer</option>
              {offers.map((o) => (
                <option key={o.tracking_id} value={o.tracking_id}>
                  {o.name} — {o.type} — {o.payout}$
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Weight (1 - 100)"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="border p-3 rounded"
            />

            <button
              onClick={saveRule}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Add Rule
            </button>
          </div>
        </div>
      )}

      {/* RULES LIST */}
      {rules.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-3">Active Rules</h3>

          <table className="min-w-full border text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2">Offer</th>
                <th className="p-2">Geo</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">Weight</th>
                <th className="p-2">Redirect URL</th>
              </tr>
            </thead>

            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.geo}</td>
                  <td className="p-2">{r.carrier}</td>
                  <td className="p-2">{r.weight}</td>
                  <td className="p-2 text-blue-600 underline cursor-pointer">
                    {r.redirect_url}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
