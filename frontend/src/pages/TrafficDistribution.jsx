// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [meta, setMeta] = useState([]); // tracking links
  const [selectedTrackingId, setSelectedTrackingId] = useState(null);
  const [publisherDetails, setPublisherDetails] = useState(null);

  const [offers, setOffers] = useState([]); // fetched offers (filtered)
  const [rules, setRules] = useState([]);

  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [weight, setWeight] = useState(100);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [type, setType] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);

  const [remaining, setRemaining] = useState(100);

  // load rules for pub
  const loadRules = async (code) => {
    if (!code) return;
    try {
      const r = await apiClient.get(`/distribution/rules?pub_id=${encodeURIComponent(code)}`);
      setRules(r.data || []);
    } catch (err) {
      console.error("rules fetch failed", err);
      setRules([]);
    }
  };

  // load meta (tracking links)
  const loadMeta = async () => {
    if (!pubCode) return alert("Enter PUB_ID");
    try {
      const res = await apiClient.get(`/distribution/meta?pub_id=${encodeURIComponent(pubCode)}`);
      setMeta(res.data || []);
      // choose first by default
      if (res.data && res.data.length) {
        setSelectedTrackingId(res.data[0].tracking_link_id);
        setPublisherDetails({
          pub_code: pubCode,
          publisher_id: res.data[0].publisher_id,
          publisher_name: res.data[0].publisher_name,
          combos: res.data.map((d) => `${d.geo || ""}/${d.carrier || ""}`).join(", "),
        });
      } else {
        setSelectedTrackingId(null);
        setPublisherDetails(null);
      }
      // load rules also
      await loadRules(pubCode);
      // compute remaining
      const rem = await apiClient.get(`/distribution/rules/remaining?pub_id=${encodeURIComponent(pubCode)}`);
      setRemaining(rem.data.remaining ?? 100);
    } catch (err) {
      console.error("meta fetch failed", err);
      setMeta([]);
      setPublisherDetails(null);
    }
  };

  // fetch offers filtered by geo/carrier and excluding already used offers for selected tracking link
  const loadOffers = async () => {
    if (!selectedTrackingId) return setOffers([]);
    // find matched tracking link to get geo/carrier
    const track = meta.find((m) => m.tracking_link_id === Number(selectedTrackingId));
    if (!track) return setOffers([]);
    const geo = track.geo || "";
    const carrier = track.carrier || "";

    // compute exclude list from rules (offer_id)
    const excludeIds = rules
      .filter((r) => r.tracking_link_id === Number(selectedTrackingId))
      .map((r) => r.offer_id)
      .filter(Boolean);

    const excludeParam = excludeIds.length ? `&exclude=${excludeIds.join(",")}` : "";
    try {
      const res = await apiClient.get(`/distribution/offers?geo=${encodeURIComponent(geo)}&carrier=${encodeURIComponent(carrier)}${excludeParam}`);
      setOffers(res.data || []);
    } catch (err) {
      console.error("offers fetch failed", err);
      setOffers([]);
    }
  };

  useEffect(() => {
    // when selectedTrackingId or rules change -> reload offers & remaining
    loadOffers();
    if (publisherDetails?.pub_code) {
      apiClient.get(`/distribution/rules/remaining?pub_id=${encodeURIComponent(publisherDetails.pub_code)}&tracking_link_id=${selectedTrackingId || ""}`)
        .then(r => setRemaining(r.data.remaining ?? 100))
        .catch(() => setRemaining(100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrackingId, rules, meta]);

  const handleAddRule = async () => {
    if (!publisherDetails) return alert("Load publisher meta first");
    if (!selectedTrackingId) return alert("Select a tracking link");
    if (!selectedOfferId) return alert("Select an offer");

    // remaining check
    const sum = rules
      .filter(r => r.pub_id === publisherDetails.pub_code && r.tracking_link_id === Number(selectedTrackingId))
      .reduce((s, x) => s + Number(x.weight || 0), 0);
    if (sum + Number(weight) > 100) {
      return alert("Weight exceeds remaining percentage");
    }

    // Build payload
    const offer = offers.find(o => Number(o.id) === Number(selectedOfferId));
    const track = meta.find(m => m.tracking_link_id === Number(selectedTrackingId));
    const payload = {
      pub_id: publisherDetails.pub_code,
      publisher_id: publisherDetails.publisher_id,
      publisher_name: publisherDetails.publisher_name,

      tracking_link_id: Number(selectedTrackingId),
      geo: (track?.geo || "").toString(),
      carrier: (track?.carrier || "").toString(),

      offer_id: Number(offer.id),
      offer_code: offer.offer_id,
      offer_name: offer.offer_name,
      advertiser_name: offer.advertiser_name,

      redirect_url: offer.tracking_url || track?.tracking_url || null,
      type: offer.type || track?.type || null,
      weight: Number(weight),
      status: "active",
      created_by: 1
    };

    try {
      // if editing -> PUT
      if (isEditing && editingRuleId) {
        await apiClient.put(`/distribution/rules/${editingRuleId}`, payload);
        setIsEditing(false);
        setEditingRuleId(null);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }
      // refresh
      await loadRules(publisherDetails.pub_code);
      setSelectedOfferId("");
      setWeight(100);
      setRedirectUrl("");
    } catch (err) {
      if (err.response?.status === 409) {
        alert("That offer is already assigned for this publisher/tracking link.");
      } else {
        console.error("add rule failed", err);
        alert("Failed to add rule");
      }
    }
  };

  const handleEdit = (r) => {
    setIsEditing(true);
    setEditingRuleId(r.id);
    setSelectedTrackingId(r.tracking_link_id);
    setSelectedOfferId(r.offer_id);
    setWeight(r.weight || 100);
    setType(r.type || "");
    setRedirectUrl(r.redirect_url || "");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      if (publisherDetails) await loadRules(publisherDetails.pub_code);
    } catch (err) {
      console.error("delete failed", err);
      alert("Failed to delete");
    }
  };

  // when user loads config
  const handleLoadConfig = async () => {
    await loadMeta();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution</h1>

      <div className="flex gap-3 mb-6 items-center">
        <input className="border p-2 rounded w-64" placeholder="PUB_CODE e.g. PUB03" value={pubCode} onChange={(e) => setPubCode(e.target.value.toUpperCase())} />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleLoadConfig}>Load Config</button>
      </div>

      {publisherDetails && (
        <div className="mb-6">
          <div><strong>PUB ID:</strong> {publisherDetails.pub_code}</div>
          <div><strong>Publisher ID:</strong> {publisherDetails.publisher_id}</div>
          <div><strong>Publisher Name:</strong> {publisherDetails.publisher_name}</div>
          <div><strong>Combos:</strong> {publisherDetails.combos}</div>
        </div>
      )}

      {/* Select tracking link */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-2">Select Offer for Distribution</h3>

        <div className="flex gap-3 items-center">
          <select className="border p-2 rounded w-2/5" value={selectedTrackingId || ""} onChange={(e) => setSelectedTrackingId(Number(e.target.value) || null)}>
            <option value="">Select tracking link (publisher)</option>
            {meta.map(m => (
              <option key={m.tracking_link_id} value={m.tracking_link_id}>
                {m.pub_code} • {m.geo || "-"} / {m.carrier || "-"} • {m.type || "-"}
              </option>
            ))}
          </select>

          <select className="border p-2 rounded w-2/5" value={selectedOfferId || ""} onChange={(e) => setSelectedOfferId(Number(e.target.value) || "")}>
            <option value="">Select Offer</option>
            {offers.map(o => (
              <option key={o.id} value={o.id}>
                {o.offer_id} — {o.offer_name} ({o.advertiser_name})
              </option>
            ))}
          </select>

          <input type="number" className="border p-2 rounded w-24" value={weight} onChange={(e) => setWeight(Number(e.target.value))} min="1" max="100" />
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleAddRule}>
            {isEditing ? "Update Rule" : "Add Rule"}
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Remaining percentage (this tracking link): <strong>{remaining}%</strong>
        </div>
      </div>

      {/* Active rules */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Active Rules</h3>
        <table className="min-w-full border text-sm bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">PUB_ID</th>
              <th className="p-2">Publisher</th>
              <th className="p-2">Geo</th>
              <th className="p-2">Carrier</th>
              <th className="p-2">Offer Code</th>
              <th className="p-2">Advertiser</th>
              <th className="p-2">Offer</th>
              <th className="p-2">Type</th>
              <th className="p-2">Weight</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr><td colSpan={10} className="p-4 text-center">No rules configured yet</td></tr>
            )}
            {rules.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.pub_id}</td>
                <td className="p-2">{r.publisher_name}</td>
                <td className="p-2">{r.geo}</td>
                <td className="p-2">{r.carrier}</td>
                <td className="p-2">{r.offer_code}</td>
                <td className="p-2">{r.advertiser_name}</td>
                <td className="p-2">{r.offer_name}</td>
                <td className="p-2">{r.type}</td>
                <td className="p-2">{r.weight}%</td>
                <td className="p-2 flex gap-2">
                  <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => handleEdit(r)}>Edit</button>
                  <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => handleDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
