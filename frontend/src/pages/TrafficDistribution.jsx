// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useState } from "react";

const BACKEND = "https://backend.mob13r.com";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [selectedGeo, setSelectedGeo] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [rules, setRules] = useState([]);

  // fetch meta for pubId
  const fetchMeta = async (p) => {
    if (!p) return;
    setLoadingMeta(true);
    try {
      const token = localStorage.getItem("mob13r_token");
      const res = await fetch(`${BACKEND}/api/distribution/meta?pub_id=${encodeURIComponent(p)}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        console.warn("meta fetch failed", res.status, txt);
        setMeta({ error: true, geos: [], carriers: [], offers: [] });
      } else {
        const data = await res.json();
        setMeta(data);
        // reset selections
        setSelectedGeo("");
        setSelectedCarrier("");
        setSelectedOfferId("");
      }
    } catch (err) {
      console.error("meta fetch err", err);
      setMeta({ error: true, geos: [], carriers: [], offers: [] });
    } finally {
      setLoadingMeta(false);
    }
  };

  // Add a local distribution rule (you can POST to backend later)
  const addRule = () => {
    if (!pubId) return alert("Select PUB_ID first");
    if (!selectedOfferId) return alert("Select Offer");
    const offer = (meta?.offers || []).find((o) => String(o.offer_id) === String(selectedOfferId));
    const newRule = {
      id: Date.now(),
      pub_id: pubId,
      publisher_name: meta?.publisher_name || null,
      geo: selectedGeo || offer?.geo || null,
      carrier: selectedCarrier || offer?.carrier || null,
      offer_id: selectedOfferId,
      offer_name: offer?.name || "",
      weight: 100,
      priority: 1,
    };
    setRules((r) => [newRule, ...r]);
  };

  const removeRule = (id) => setRules((r) => r.filter((x) => x.id !== id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          placeholder="Enter PUB_ID (e.g. PUB02)"
          className="px-3 py-2 border rounded w-48"
        />
        <button
          onClick={() => fetchMeta(pubId)}
          className="px-3 py-2 bg-blue-600 text-white rounded"
          disabled={loadingMeta || !pubId}
        >
          {loadingMeta ? "Loading..." : "Fetch PUB Meta"}
        </button>
        {meta?.publisher_name && (
          <div className="ml-4 text-sm">
            Publisher: <strong>{meta.publisher_name}</strong>
          </div>
        )}
      </div>

      {/* Meta selects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs mb-1">Geo</label>
          <select
            value={selectedGeo}
            onChange={(e) => setSelectedGeo(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">— any —</option>
            {(meta?.geos || []).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">Carrier</label>
          <select
            value={selectedCarrier}
            onChange={(e) => setSelectedCarrier(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">— any —</option>
            {(meta?.carriers || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">Offers (filtered)</label>
          <select
            value={selectedOfferId}
            onChange={(e) => setSelectedOfferId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">— select offer —</option>
            {(meta?.offers || [])
              .filter((o) => {
                // filter logic: if selectedGeo/carrier set, match both if provided
                if (selectedGeo && String(o.geo) !== String(selectedGeo)) return false;
                if (selectedCarrier && String(o.carrier) !== String(selectedCarrier)) return false;
                return true;
              })
              .map((o) => (
                <option key={o.offer_id} value={o.offer_id}>
                  {o.name} ({o.geo || "any"} / {o.carrier || "any"})
                </option>
              ))}
          </select>
        </div>
      </div>

      <div>
        <button onClick={addRule} className="px-3 py-2 bg-green-600 text-white rounded">
          Add Distribution Rule (local)
        </button>
        <small className="ml-2 text-gray-500">Rules added locally — POST to /api/distribution to persist</small>
      </div>

      {/* Rules table */}
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Preview Rules</h3>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2">PUB_ID</th>
                <th className="px-3 py-2">Publisher</th>
                <th className="px-3 py-2">Geo</th>
                <th className="px-3 py-2">Carrier</th>
                <th className="px-3 py-2">Offer</th>
                <th className="px-3 py-2">Weight</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.pub_id}</td>
                  <td className="px-3 py-2">{r.publisher_name}</td>
                  <td className="px-3 py-2">{r.geo}</td>
                  <td className="px-3 py-2">{r.carrier}</td>
                  <td className="px-3 py-2">{r.offer_name}</td>
                  <td className="px-3 py-2">{r.weight}%</td>
                  <td className="px-3 py-2">{r.priority}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeRule(r.id)} className="text-red-500">Remove</button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500">No rules yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
