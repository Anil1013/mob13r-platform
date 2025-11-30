import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function RuleModal({ rule, pubId, trackingLinkId, remaining, onClose, onSaved }) {
  const isEdit = Boolean(rule);

  const [geo, setGeo] = useState(rule?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || "ALL");

  const [offers, setOffers] = useState([]);
  const [offerId, setOfferId] = useState(rule?.offer_id || "");

  const [weight, setWeight] = useState(rule?.weight || "");
  const [fallback, setFallback] = useState(rule?.is_fallback || false);

  /* -----------------------------  
       Load Offers by GEO+Carrier
  ------------------------------ */
  const loadOffers = async () => {
    try {
      const q = `/offers/list?geo=${geo}&carrier=${carrier}&status=active`;
      const r = await apiClient.get(q);
      setOffers(r.data.offers || []);
    } catch {
      setOffers([]);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [geo, carrier]);

  /* -----------------------------  
       Save Rule
  ------------------------------ */

  const save = async () => {
    const payload = {
      pub_id: pubId,
      tracking_link_id: trackingLinkId,
      geo,
      carrier,
      offer_id: offerId,
      weight: weight ? Number(weight) : null,
      autoFill: !weight,
      is_fallback: fallback,
    };

    try {
      if (isEdit)
        await apiClient.put(`/distribution/rules/${rule.id}`, payload);
      else
        await apiClient.post(`/distribution/rules`, payload);

      onSaved();
    } catch {
      alert("Error saving rule");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-[400px] space-y-4">

        <h2 className="text-xl font-bold">
          {isEdit ? "Edit Rule" : "Add Rule"}
        </h2>

        {/* GEO */}
        <div>
          <label>GEO</label>
          <input
            className="w-full border p-2"
            value={geo}
            onChange={(e) => setGeo(e.target.value.toUpperCase())}
          />
        </div>

        {/* Carrier */}
        <div>
          <label>Carrier</label>
          <input
            className="w-full border p-2"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value.toUpperCase())}
          />
        </div>

        {/* Offer Dropdown */}
        <div>
          <label>Offer</label>
          <select
            className="w-full border p-2"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          >
            <option>Select Offer</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} — {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* Weight */}
        <div>
          <label>Weight (Remaining {remaining}%)</label>
          <input
            className="w-full border p-2"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Blank = AutoFill"
          />
        </div>

        {/* Fallback */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fallback}
            onChange={(e) => setFallback(e.target.checked)}
          />
          <label>Fallback</label>
        </div>

        <div className="flex justify-end gap-3">
          <button className="px-3 py-1 border" onClick={onClose}>
            Cancel
          </button>

          <button className="px-3 py-1 bg-green-600 text-white" onClick={save}>
            Save
          </button>
        </div>

      </div>
    </div>
  );
}
