import React, { useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [links, setLinks] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);

  const loadLinks = async () => {
    if (!pubCode) return alert("Enter PUB Code");

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_code=${pubCode}`
      );
      setLinks(res.data);
      setRules([]);
    } catch (err) {
      console.error("Fetch tracking links error:", err);
    }
  };

  const loadRules = async (link) => {
    setSelectedLink(link);

    try {
      const res = await apiClient.get(
        `/distribution/rules?tracking_link_id=${link.id}`
      );
      setRules(res.data);
    } catch (err) {
      console.error("Fetch rules error:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution</h1>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="PUB03"
          className="border rounded p-2"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value)}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={loadLinks}
        >
          Load Links
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Tracking Links */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-3">Tracking Links</h3>

          {links.length === 0 && <p>No tracking links</p>}

          {links.map((link) => (
            <div
              key={link.id}
              className={`p-2 border rounded cursor-pointer mb-2 ${
                selectedLink?.id === link.id ? "bg-blue-200" : ""
              }`}
              onClick={() => loadRules(link)}
            >
              {link.name} ({link.pub_code})
            </div>
          ))}
        </div>

        {/* Rules */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-3">Rules</h3>

          {rules.length === 0 && <p>Select a link to view rules</p>}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th>Offer</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Device</th>
                <th>Priority</th>
                <th>Weight</th>
                <th>Fallback</th>
              </tr>
            </thead>

            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b">
                  <td>{r.offer_id}</td>
                  <td>{r.geo}</td>
                  <td>{r.carrier}</td>
                  <td>{r.device}</td>
                  <td>{r.priority}</td>
                  <td>{r.weight}</td>
                  <td>{r.is_fallback ? "YES" : "NO"}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}
