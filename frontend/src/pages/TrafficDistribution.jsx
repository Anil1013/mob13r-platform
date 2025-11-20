// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient"; // your axios instance

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [publisherMeta, setPublisherMeta] = useState(null);
  const [offers, setOffers] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [selectedTrackingLinkId, setSelectedTrackingLinkId] = useState("");
  const [weight, setWeight] = useState(100);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState(null);

  const fetchMeta = async (id) => {
    setLoadingMeta(true);
    setError(null);
    setPublisherMeta(null);
    setOffers([]);
    setRules([]);
    try {
      const metaRes = await apiClient.get("/distribution/meta", { params: { pub_id: id }});
      setPublisherMeta(metaRes.data.publisher);
      // If combos exist we'll pick the first geo/carrier by default for offers fetch
      const combos = metaRes.data.combos || [];
      const defaultCombo = combos[0] || {};
      // Save tracking rows for tracking_link selection
      const trackingRows = metaRes.data.tracking_rows || [];
      // set a default tracking link id if available
      if (trackingRows.length > 0) setSelectedTrackingLinkId(trackingRows[0].id);

      // load rules & offers
      await loadRules(id);
      // fetch offers for chosen combo
      await fetchOffers(defaultCombo.geo || null, defaultCombo.carrier || null);
      setPublisherMeta(prev => ({ ...prev, combos, trackingRows }));
    } catch (err) {
      console.error("meta fetch failed", err);
      setError(err);
    } finally {
      setLoadingMeta(false);
    }
  };

  const fetchOffers = async (geo, carrier) => {
    try {
      const res = await apiClient.get("/distribution/offers", { params: { geo, carrier }});
      setOffers(res.data || []);
    } catch (err) {
      console.error("offers fetch failed", err);
      setOffers([]);
    }
  };

  const loadRules = async (id) => {
    try {
      const res = await apiClient.get("/distribution/rules", { params: { pub_id: id }});
      setRules(res.data || []);
    } catch (err) {
      console.error("rules fetch failed", err);
      setRules([]);
    }
  };

  const onLoadConfig = () => {
    if (!pubId) return alert("Enter PUB_ID");
    fetchMeta(pubId);
  };

  const handleAddRule = async () => {
    if (!pubId) return alert("Enter PUB_ID");
    if (!selectedOfferId) return alert("Select an offer");
    if (!selectedTrackingLinkId) return alert("Select tracking link (publisher tracking)");

    try {
      const offer = offers.find(o => Number(o.id) === Number(selectedOfferId));
      const tracking = publisherMeta?.trackingRows?.find(t => t.id === Number(selectedTrackingLinkId));

      const payload = {
        pub_id: pubId,
        publisher_id: publisherMeta.publisher_id || null,
        publisher_name: publisherMeta.publisher_name || null,
        offer_id: Number(selectedOfferId),
        offer_code: offer?.offer_code || offer?.code || null,
        offer_name: offer?.offer_name || offer?.name || null,
        advertiser_name: offer?.advertiser_name || null,
        tracking_link_id: Number(selectedTrackingLinkId),
        geo: tracking?.geo || (publisherMeta?.combos?.[0]?.geo || ""),
        carrier: tracking?.carrier || (publisherMeta?.combos?.[0]?.carrier || ""),
        weight: Number(weight) || 100,
        type: offer?.type || tracking?.type || null
      };

      await apiClient.post("/distribution/rules", payload);
      alert("Rule added");
      await loadRules(pubId);
    } catch (err) {
      console.error("add rule failed", err);
      alert("Failed to add rule: " + (err?.response?.data?.message || err.message));
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Delete rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      await loadRules(pubId);
    } catch (err) {
      console.error("delete rule failed", err);
      alert("Delete failed");
    }
  };

  const remainingPercentage = () => {
    const total = rules.reduce((s, r) => s + (r.weight || 0), 0);
    return Math.max(0, 100 - total);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Traffic Distribution</h2>

      <div className="flex gap-3 mb-4">
        <input
          placeholder="Enter PUB_ID (e.g. PUB03)"
          value={pubId}
          onChange={(e) => setPubId(e.target.value.trim())}
          className="border p-2 rounded w-64"
        />
        <button onClick={onLoadConfig} className="px-4 py-2 bg-blue-600 text-white rounded">Load Config</button>
      </div>

      {loadingMeta && <div>Loading publisher data...</div>}

      {error && <div className="text-red-600 mb-3">Error loading data: {String(error?.message || error)}</div>}

      {publisherMeta && (
        <div className="mb-6">
          <h3 className="font-semibold">Publisher Details</h3>
          <div>PUB ID: <strong>{publisherMeta.pub_id || pubId}</strong></div>
          <div>Publisher ID: <strong>{publisherMeta.publisher_id ?? "—"}</strong></div>
          <div>Publisher Name: <strong>{publisherMeta.publisher_name ?? "—"}</strong></div>
          <div>Combos: {publisherMeta.combos?.map(c => `${c.geo}/${c.carrier}`).join(", ")}</div>
        </div>
      )}

      {/* Rule creation */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h4 className="font-semibold mb-2">Select Offer for Distribution</h4>

        <div className="grid grid-cols-4 gap-3 items-center">
          <div>
            <label className="block text-sm mb-1">Tracking Link (publisher)</label>
            <select value={selectedTrackingLinkId} onChange={(e) => setSelectedTrackingLinkId(e.target.value)} className="border p-2 rounded w-full">
              <option value="">Select tracking link</option>
              {publisherMeta?.trackingRows?.map(t => (
                <option key={t.id} value={t.id}>
                  {t.pub_code} • {t.geo}/{t.carrier} • {t.type || "type"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Offer</label>
            <select value={selectedOfferId} onChange={(e) => setSelectedOfferId(e.target.value)} className="border p-2 rounded w-full">
              <option value="">Select Offer</option>
              {offers.map(o => (
                <option key={o.id} value={o.id}>
                  {o.offer_code || o.code || "OFF" + o.id} — {o.offer_name || o.name} ({o.advertiser_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Weight (%)</label>
            <input type="number" min="1" max="100" value={weight} onChange={(e) => setWeight(e.target.value)} className="border p-2 rounded w-full" />
          </div>

          <div className="flex items-end">
            <button onClick={handleAddRule} className="bg-green-600 text-white px-4 py-2 rounded w-full">Add Rule</button>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Remaining percentage (100 - sum): <strong>{remainingPercentage()}%</strong>
        </div>
      </div>

      {/* Active rules table */}
      <div>
        <h4 className="font-semibold mb-2">Active Rules</h4>
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">PUB_ID</th>
                <th className="p-2">Publisher</th>
                <th className="p-2">Geo</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">Offer Code</th>
                <th className="p-2">Advertiser</th>
                <th className="p-2">Offer</th>
                <th className="p-2">Weight</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && <tr><td colSpan="9" className="p-4">No rules configured yet</td></tr>}
              {rules.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono">{r.pub_id}</td>
                  <td className="p-2">{r.publisher_name}</td>
                  <td className="p-2">{r.geo}</td>
                  <td className="p-2">{r.carrier}</td>
                  <td className="p-2">{r.offer_code}</td>
                  <td className="p-2">{r.advertiser_name}</td>
                  <td className="p-2">{r.offer_name}</td>
                  <td className="p-2">{r.weight}%</td>
                  <td className="p-2">
                    <button onClick={() => {
                      const newWeight = prompt("New weight %", String(r.weight));
                      if (newWeight !== null) {
                        apiClient.put(`/distribution/rules/${r.id}`, { weight: Number(newWeight) })
                          .then(() => loadRules(pubId))
                          .catch(e => alert("Update failed: " + e.message));
                      }
                    }} className="mr-2 px-2 py-1 bg-yellow-400 rounded">Edit</button>

                    <button onClick={() => handleDeleteRule(r.id)} className="px-2 py-1 bg-red-500 text-white rounded">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
