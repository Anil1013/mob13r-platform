import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [meta, setMeta] = useState(null);

  const fetchMeta = async () => {
    if (!pubId) return;

    try {
      const res = await apiClient.get(`/distribution/meta?pub_id=${pubId}`);
      setMeta(res.data);
    } catch (err) {
      console.error("meta fetch failed", err);
      alert("Failed to load distribution data");
    }
  };

  useEffect(() => {
    fetchMeta();
  }, [pubId]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Traffic Distribution</h2>

      {/* PUB_ID select */}
      <input
        type="text"
        placeholder="Enter PUB_ID (PUB01)"
        className="border p-2 rounded mb-4"
        value={pubId}
        onChange={(e) => setPubId(e.target.value.toUpperCase())}
      />

      {meta && (
        <div className="border p-4 rounded bg-white">
          <h3 className="text-lg font-bold mb-1">
            Publisher: {meta.publisher_name}
          </h3>
          <p className="text-sm text-gray-600">
            Geo: {meta.geo} • Carrier: {meta.carrier}
          </p>

          <h4 className="text-md font-semibold mt-4">Offers for this PUB_ID</h4>

          <table className="w-full border mt-2 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Offer</th>
                <th className="p-2">Type</th>
                <th className="p-2">Payout</th>
                <th className="p-2">Tracking</th>
              </tr>
            </thead>

            <tbody>
              {meta.offers.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2">{o.name}</td>
                  <td className="p-2">{o.type}</td>
                  <td className="p-2">${o.payout}</td>
                  <td className="p-2">
                    {o.type === "INAPP" ? (
                      <div className="flex flex-col text-xs">
                        <span>SendPIN: {o.pin_send_url}</span>
                        <span>VerifyPIN: {o.pin_verify_url}</span>
                        <span>Status: {o.check_status_url}</span>
                        <span>Portal: {o.portal_url}</span>
                      </div>
                    ) : (
                      o.tracking_url
                    )}
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
