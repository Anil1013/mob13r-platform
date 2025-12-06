import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------
     LOAD TRACKING LINKS by pub_code
  ------------------------------------------------------------------ */
  const loadTrackingLinks = async () => {
    if (!pubCode) {
      alert("Enter pub_code (Example: PUB03)");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.get(`/tracking/list/${pubCode}`);
      setTrackingLinks(res.data || []);
      setSelectedLink(null);
      setRules([]);
    } catch (err) {
      console.error(err);
      alert("Error loading tracking links");
    }
    setLoading(false);
  };

  /* ------------------------------------------------------------------
     LOAD RULES WHEN A TRACKING LINK IS CLICKED
  ------------------------------------------------------------------ */
  const loadRules = async (link) => {
    setSelectedLink(link);
    setRules([]);

    try {
      const res = await apiClient.get(
        `/distribution/rules/${link.pub_code}/${link.id}`
      );
      setRules(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Error loading rules");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Traffic Distribution</h2>

      {/* INPUT + LOAD BUTTON */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Enter PUB Code (e.g., PUB03)"
          className="border rounded px-3 py-2 w-64"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value)}
        />
        <button
          onClick={loadTrackingLinks}
          className="bg-blue-600 text-white px-5 py-2 rounded"
        >
          {loading ? "Loading..." : "Load Links"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ---------------- LEFT PANEL: TRACKING LINKS ---------------- */}
        <div className="border rounded-lg p-4 shadow bg-white">
          <h3 className="text-xl font-semibold mb-4">Tracking Links</h3>

          {trackingLinks.length === 0 && (
            <p className="text-gray-500">No tracking links found</p>
          )}

          {trackingLinks.map((link) => (
            <div
              key={link.id}
              onClick={() => loadRules(link)}
              className={`p-3 mb-2 rounded border cursor-pointer ${
                selectedLink?.id === link.id
                  ? "bg-blue-100 border-blue-400"
                  : "bg-gray-50 border-gray-300"
              }`}
            >
              <strong>{link.name}</strong> ({link.pub_code})
            </div>
          ))}
        </div>

        {/* ---------------- RIGHT PANEL: RULES LIST ---------------- */}
        <div className="border rounded-lg p-4 shadow bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Rules</h3>
            {selectedLink && (
              <button className="bg-green-600 text-white px-4 py-2 rounded">
                + Add Rule
              </button>
            )}
          </div>

          {!selectedLink && (
            <p className="text-gray-500">Select a tracking link</p>
          )}

          {selectedLink && rules.length === 0 && (
            <p className="text-gray-500">No rules found</p>
          )}

          {rules.length > 0 && (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200 text-left">
                  <th className="p-2 border">Offer</th>
                  <th className="p-2 border">Geo</th>
                  <th className="p-2 border">Carrier</th>
                  <th className="p-2 border">Device</th>
                  <th className="p-2 border">Priority</th>
                  <th className="p-2 border">Weight</th>
                  <th className="p-2 border">Fallback</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border">
                    <td className="p-2 border">{r.offer_id}</td>
                    <td className="p-2 border">{r.geo}</td>
                    <td className="p-2 border">{r.carrier}</td>
                    <td className="p-2 border">{r.device}</td>
                    <td className="p-2 border">{r.priority}</td>
                    <td className="p-2 border">{r.weight}</td>
                    <td className="p-2 border">
                      {r.is_fallback ? "YES" : "NO"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
