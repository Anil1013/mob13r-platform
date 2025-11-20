// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  // inputs & state
  const [searchQuery, setSearchQuery] = useState("");
  const [pubCode, setPubCode] = useState("");
  const [meta, setMeta] = useState([]); // tracking link meta for selected pub
  const [offers, setOffers] = useState([]); // filtered offers for selected tracking link
  const [rules, setRules] = useState([]); // rules for selected pub
  const [overview, setOverview] = useState([]); // global overview (all pubs)

  const [selectedTrackingId, setSelectedTrackingId] = useState(null);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [weight, setWeight] = useState(100);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [remaining, setRemaining] = useState(100);

  // Load global overview table
  const loadOverview = async () => {
    try {
      const res = await apiClient.get("/distribution/overview");
      setOverview(res.data || []);
    } catch (err) {
      console.error("overview fetch failed", err);
      setOverview([]);
    }
  };

  // Load meta (publisher tracking links) for a pub code
  const loadMeta = async (code) => {
    if (!code) return;
    try {
      const res = await apiClient.get(`/distribution/meta?pub_id=${encodeURIComponent(code)}`);
      setMeta(res.data || []);
      // default select first tracking link
      if (res.data && res.data.length) setSelectedTrackingId(res.data[0].tracking_link_id);
      else setSelectedTrackingId(null);
      // load rules for pub
      await loadRules(code);
      // get remaining
      const rem = await apiClient.get(`/distribution/rules/remaining?pub_id=${encodeURIComponent(code)}`);
      setRemaining(rem.data.remaining ?? 100);
    } catch (err) {
      console.error("meta fetch failed", err);
      setMeta([]);
      setRules([]);
      setRemaining(100);
    }
  };

  // Load rules for pub code
  const loadRules = async (code) => {
    if (!code) return setRules([]);
    try {
      const r = await apiClient.get(`/distribution/rules?pub_id=${encodeURIComponent(code)}`);
      setRules(r.data || []);
    } catch (err) {
      console.error("rules fetch failed", err);
      setRules([]);
    }
  };

  // Load offers for selected tracking link (consider excludes)
  const loadOffers = async () => {
    if (!selectedTrackingId) return setOffers([]);
    const track = meta.find((m) => Number(m.tracking_link_id) === Number(selectedTrackingId));
    if (!track) return setOffers([]);

    const geo = track.geo || "";
    const carrier = track.carrier || "";

    // exclude offers already mapped for this tracking link
    const excludeIds = rules
      .filter((r) => Number(r.tracking_link_id) === Number(selectedTrackingId))
      .map((r) => r.offer_id)
      .filter(Boolean);
    const excludeParam = excludeIds.length ? `&exclude=${excludeIds.join(",")}` : "";

    try {
      const res = await apiClient.get(
        `/distribution/offers?geo=${encodeURIComponent(geo)}&carrier=${encodeURIComponent(carrier)}${excludeParam}`
      );
      setOffers(res.data || []);
    } catch (err) {
      console.error("offers fetch failed", err);
      setOffers([]);
    }
  };

  // effects
  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    loadOffers();
    if (pubCode) {
      apiClient
        .get(`/distribution/rules/remaining?pub_id=${encodeURIComponent(pubCode)}&tracking_link_id=${selectedTrackingId || ""}`)
        .then((r) => setRemaining(r.data.remaining ?? 100))
        .catch(() => setRemaining(100));
    }
    // eslint-disable-next-line
  }, [selectedTrackingId, rules, meta]);

  // Add or update rule
  const handleAddRule = async () => {
    if (!pubCode) return alert("Load publisher meta first (enter PUB_ID and click Load)");
    if (!selectedTrackingId) return alert("Select a tracking link");
    if (!selectedOfferId) return alert("Select an offer");

    // check sum doesn't exceed 100 for this pub + tracking_link
    const sum = rules
      .filter((r) => r.pub_id === pubCode && Number(r.tracking_link_id) === Number(selectedTrackingId))
      .reduce((s, x) => s + Number(x.weight || 0), 0);

    if (sum + Number(weight) > 100) {
      return alert("Weight exceeds remaining percentage for this tracking link");
    }

    const offer = offers.find((o) => Number(o.id) === Number(selectedOfferId));
    const track = meta.find((m) => Number(m.tracking_link_id) === Number(selectedTrackingId));

    const payload = {
      pub_id: pubCode,
      publisher_id: track?.publisher_id || null,
      publisher_name: track?.publisher_name || null,
      tracking_link_id: Number(selectedTrackingId),
      geo: track?.geo || "",
      carrier: track?.carrier || "",
      offer_id: Number(offer.id),
      offer_code: offer.offer_id,
      offer_name: offer.offer_name,
      advertiser_name: offer.advertiser_name,
      redirect_url: offer.tracking_url || track?.tracking_url || null,
      type: offer.type || track?.type || null,
      weight: Number(weight),
      status: "active",
      created_by: 1,
    };

    try {
      if (isEditing && editingRuleId) {
        await apiClient.put(`/distribution/rules/${editingRuleId}`, payload);
        setIsEditing(false);
        setEditingRuleId(null);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }
      await loadRules(pubCode);
      setSelectedOfferId("");
      setWeight(100);
      await loadOverview();
    } catch (err) {
      console.error("add rule failed", err);
      if (err.response?.status === 409) alert("That offer is already mapped for this pub + tracking link");
      else alert("Failed to add rule");
    }
  };

  const handleEdit = (r) => {
    setIsEditing(true);
    setEditingRuleId(r.id);
    setSelectedTrackingId(r.tracking_link_id);
    setSelectedOfferId(r.offer_id);
    setWeight(r.weight || 100);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      await loadRules(pubCode);
      await loadOverview();
    } catch (err) {
      console.error("delete failed", err);
      alert("Delete failed");
    }
  };

  const handleLoadConfig = async () => {
    if (!pubCode) return alert("Enter PUB_ID");
    await loadMeta(pubCode);
    await loadOverview();
  };

  // GLOBAL SEARCH: filter everything live
  const q = searchQuery.trim().toLowerCase();
  const filteredOverview = useMemo(() => {
    if (!q) return overview;
    return overview.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [q, overview]);

  const filteredRules = useMemo(() => {
    if (!q) return rules;
    return rules.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [q, rules]);

  const filteredOffers = useMemo(() => {
    if (!q) return offers;
    return offers.filter((o) => JSON.stringify(o).toLowerCase().includes(q));
  }, [q, offers]);

  const filteredMeta = useMemo(() => {
    if (!q) return meta;
    return meta.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
  }, [q, meta]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution (Global)</h1>

      <div className="mb-4">
        <input
          placeholder="🔎 Global search (search pub_id, publisher, offer, geo, carrier, advertiser...)"
          className="w-full border p-2 rounded"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-3 mb-6 items-center">
        <input
          className="border p-2 rounded w-64"
          placeholder="PUB_CODE e.g. PUB03"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleLoadConfig}>
          Load Config
        </button>
      </div>

      {meta.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Publisher Tracking Links</h3>
          <table className="min-w-full border text-sm bg-white mb-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">tracking_link_id</th>
                <th className="p-2">pub_code</th>
                <th className="p-2">publisher_name</th>
                <th className="p-2">geo</th>
                <th className="p-2">carrier</th>
                <th className="p-2">type</th>
                <th className="p-2">status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeta.map((m) => (
                <tr key={m.tracking_link_id}>
                  <td className="p-2 font-mono">{m.tracking_link_id}</td>
                  <td className="p-2">{m.pub_code}</td>
                  <td className="p-2">{m.publisher_name}</td>
                  <td className="p-2">{m.geo}</td>
                  <td className="p-2">{m.carrier}</td>
                  <td className="p-2">{m.type}</td>
                  <td className="p-2">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selector + Add rule */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-2">Create / Edit Rule (per tracking link)</h3>

        <div className="flex gap-3 items-center">
          <select
            className="border p-2 rounded w-2/5"
            value={selectedTrackingId || ""}
            onChange={(e) => setSelectedTrackingId(Number(e.target.value) || null)}
          >
            <option value="">Select tracking link (publisher)</option>
            {meta.map((m) => (
              <option key={m.tracking_link_id} value={m.tracking_link_id}>
                {m.pub_code} • {m.geo || "-"} / {m.carrier || "-"} • {m.type || "-"}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded w-2/5"
            value={selectedOfferId || ""}
            onChange={(e) => setSelectedOfferId(Number(e.target.value) || "")}
          >
            <option value="">Select Offer</option>
            {filteredOffers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.offer_id} — {o.offer_name} ({o.advertiser_name})
              </option>
            ))}
          </select>

          <input
            type="number"
            className="border p-2 rounded w-24"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            min="1"
            max="100"
          />
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleAddRule}>
            {isEditing ? "Update Rule" : "Add Rule"}
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Remaining percentage (this tracking link): <strong>{remaining}%</strong>
        </div>
      </div>

      {/* Active rules for this pub */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Active Rules (Selected PUB)</h3>
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
            {filteredRules.length === 0 && <tr><td colSpan={10} className="p-4 text-center">No rules configured yet</td></tr>}
            {filteredRules.map((r) => (
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

      {/* Overview (global) */}
      <div className="mt-8">
        <h3 className="font-semibold mb-2">Overview — All PUB_IDs (Global)</h3>
        <table className="min-w-full border text-sm bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">PUB_ID</th>
              <th className="p-2">Offer_ID</th>
              <th className="p-2">Offer Name</th>
              <th className="p-2">Advertiser</th>
              <th className="p-2">Geo</th>
              <th className="p-2">Carrier</th>
              <th className="p-2">Weight</th>
              <th className="p-2">Tracking Link</th>
              <th className="p-2">Redirect URL</th>
            </tr>
          </thead>
          <tbody>
            {filteredOverview.length === 0 && <tr><td colSpan={9} className="p-4 text-center">No rules</td></tr>}
            {filteredOverview.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.pub_id}</td>
                <td className="p-2">{r.offer_code}</td>
                <td className="p-2">{r.offer_name}</td>
                <td className="p-2">{r.advertiser_name}</td>
                <td className="p-2">{r.geo}</td>
                <td className="p-2">{r.carrier}</td>
                <td className="p-2">{r.weight}%</td>
                <td className="p-2 font-mono">{r.tracking_link_id}</td>
                <td className="p-2 truncate max-w-[250px]">{r.redirect_url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
