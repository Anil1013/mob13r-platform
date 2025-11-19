// File: frontend/src/pages/TrafficDistribution.jsx

import React, { useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [loading, setLoading] = useState(false);

  const [publisherName, setPublisherName] = useState("");
  const [geos, setGeos] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [offers, setOffers] = useState([]);

  const [errorMsg, setErrorMsg] = useState("");

  // ------------------------------------------
  // 🚀 Fetch META for PUB_ID
  // ------------------------------------------
  const fetchMeta = async () => {
    if (!pubId.trim()) {
      alert("⚠️ Please enter a PUB_ID");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await apiClient.get("/distribution/meta", {
        params: { pub_id: pubId.trim() },
      });

      const data = res.data;

      setPublisherName(data.publisher_name || "");
      setGeos(data.geos || []);
      setCarriers(data.carriers || []);
      setOffers(data.offers || []);

    } catch (err) {
      console.error("meta fetch failed", err);

      if (err?.response?.status === 404) {
        setErrorMsg(`❌ No tracking found for ${pubId}`);
      } else {
        setErrorMsg("⚠️ Failed to load distribution metadata");
      }

      setPublisherName("");
      setGeos([]);
      setCarriers([]);
      setOffers([]);
    }

    setLoading(false);
  };

  return (
    <div className="p-6">

      <h2 className="text-2xl font-bold mb-6">Traffic Distribution</h2>

      {/* PUB ID INPUT */}
      <div className="flex gap-3 mb-4">
        <input
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          placeholder="Enter PUB_ID (e.g. PUB02)"
          className="border p-3 rounded w-64"
        />
        <button
          onClick={fetchMeta}
          className="bg-blue-600 text-white px-5 py-3 rounded"
        >
          Fetch
        </button>
      </div>

      {loading && <p className="text-gray-600">Loading...</p>}

      {errorMsg && (
        <p className="text-red-600 font-medium mb-4">{errorMsg}</p>
      )}

      {/* RESULTS */}
      {!loading && publisherName && (
        <div className="mt-6">

          {/* Publisher */}
          <div className="text-lg mb-4">
            <strong>Publisher:</strong> {publisherName}
          </div>

          {/* GEO List */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">Geo detected:</h3>
            <div className="flex gap-2">
              {geos.map((g, i) => (
                <span key={i} className="px-3 py-1 rounded bg-gray-200">
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Carrier */}
          <div className="mb-4">
            <h3 className="font-semibold mb-1">Carriers detected:</h3>
            <div className="flex gap-2">
              {carriers.map((c, i) => (
                <span key={i} className="px-3 py-1 rounded bg-gray-200">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Offers */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Offers Found</h3>

            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Offer Name</th>
                  <th className="p-2 border">Geo</th>
                  <th className="p-2 border">Carrier</th>
                  <th className="p-2 border">Payout</th>
                  <th className="p-2 border">Landing Page</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.offer_id} className="border-t">
                    <td className="p-2 border">{o.offer_name}</td>
                    <td className="p-2 border">{o.geo}</td>
                    <td className="p-2 border">{o.carrier}</td>
                    <td className="p-2 border">₹{o.payout}</td>
                    <td className="p-2 border max-w-[250px] truncate">
                      {o.landing_page_url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}
