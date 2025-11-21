import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  /* ============================
        STATES
  ============================ */
  const [pubCode, setPubCode] = useState("");
  const [meta, setMeta] = useState([]);
  const [publisherDetails, setPublisherDetails] = useState(null);

  const [selectedTracking, setSelectedTracking] = useState("");
  const [offers, setOffers] = useState([]);
  const [rules, setRules] = useState([]);

  const [offerId, setOfferId] = useState("");
  const [weight, setWeight] = useState(100);

  const [remaining, setRemaining] = useState(100);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  /* ============================
        GLOBAL OVERVIEW TABLE
  ============================ */
  const [overview, setOverview] = useState([]);
  const [search, setSearch] = useState("");

  const loadOverview = async () => {
    try {
      const r = await apiClient.get("/distribution/overview");
      setOverview(r.data || []);
    } catch (err) {
      console.warn("overview error", err);
    }
  };

  /* ============================
        LOAD META (tracking links)
  ============================ */
  const loadMeta = async () => {
    if (!pubCode) return alert("Enter PUB_ID");

    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${encodeURIComponent(pubCode)}`
      );

      setMeta(res.data || []);

      if (res.data.length) {
        const first = res.data[0];

        setSelectedTracking(first.tracking_link_id);

        setPublisherDetails({
          pub_code: first.pub_code,
          publisher_name: first.publisher_name,
          publisher_id: first.publisher_id,
          combos: res.data
            .map((d) => `${d.geo}/${d.carrier}`)
            .join(", "),
        });
      }

      loadRules(pubCode);
      loadRemaining(pubCode, selectedTracking);

    } catch (err) {
      console.log("meta failed", err);
    }
  };

  /* ============================
        LOAD OFFERS
  ============================ */
  const loadOffers = async () => {
    if (!selectedTracking || !meta.length) return setOffers([]);

    const track = meta.find((m) => m.tracking_link_id === Number(selectedTracking));
    if (!track) return;

    const exclude = rules
      .filter((r) => r.tracking_link_id === Number(selectedTracking))
      .map((r) => r.offer_id)
      .filter(Boolean)
      .join(",");

    try {
      const r = await apiClient.get(
        `/distribution/offers?geo=${track.geo}&carrier=${track.carrier}&exclude=${exclude}`
      );
      setOffers(r.data || []);
    } catch (err) {
      console.log("offers error", err);
    }
  };

  /* ============================
        LOAD RULES
  ============================ */
  const loadRules = async (code) => {
    try {
      const r = await apiClient.get(`/distribution/rules?pub_id=${code}`);
      setRules(r.data || []);
    } catch (err) {
      console.log("rules error", err);
    }
  };

  /* ============================
        REMAINING %
  ============================ */
  const loadRemaining = async (pub, track) => {
    try {
      const r = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pub}&tracking_link_id=${track}`
      );
      setRemaining(r.data.remaining);
    } catch {
      setRemaining(100);
    }
  };

  /* ============================
        WHEN TRACKING CHANGES
  ============================ */
  useEffect(() => {
    loadOffers();
    if (publisherDetails) {
      loadRemaining(publisherDetails.pub_code, selectedTracking);
    }
  }, [selectedTracking, rules, meta]);

  /* ============================
          ADD RULE
  ============================ */
  const addRule = async () => {
    if (!publisherDetails) return alert("Load PUB first");
    if (!offerId) return alert("Select offer");

    const offer = offers.find((o) => o.id === Number(offerId));
    const track = meta.find((m) => m.tracking_link_id === Number(selectedTracking));

    const payload = {
      pub_id: publisherDetails.pub_code,
      publisher_id: publisherDetails.publisher_id,
      publisher_name: publisherDetails.publisher_name,

      tracking_link_id: selectedTracking,
      geo: track.geo,
      carrier: track.carrier,

      offer_id: offer.id,
      offer_code: offer.offer_id,
      offer_name: offer.offer_name,
      advertiser_name: offer.advertiser_name,

      redirect_url: offer.tracking_url,
      type: offer.type,
      weight: Number(weight),
    };

    try {
      if (isEditing && editId) {
        await apiClient.put(`/distribution/rules/${editId}`, payload);
        setIsEditing(false);
        setEditId(null);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }

      loadRules(publisherDetails.pub_code);
      setOfferId("");
      setWeight(100);

    } catch (err) {
      if (err.response?.status === 409) {
        return alert("Duplicate offer detected for this PUB & tracking link!");
      }
      alert("Failed to save rule");
    }
  };

  /* ============================
        EDIT RULE
  ============================ */
  const editRule = (rule) => {
    setIsEditing(true);
    setEditId(rule.id);
    setSelectedTracking(rule.tracking_link_id);
    setOfferId(rule.offer_id);
    setWeight(rule.weight);
  };

  /* ============================
        DELETE RULE
  ============================ */
  const delRule = async (id) => {
    if (!window.confirm("Delete rule?")) return;
    await apiClient.delete(`/distribution/rules/${id}`);
    loadRules(pubCode);
  };

  /* ============================
        FILTER OVERVIEW (Search)
  ============================ */
  const filteredOverview = overview.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.pub_id?.toLowerCase().includes(term) ||
      r.offer_code?.toLowerCase().includes(term) ||
      r.offer_name?.toLowerCase().includes(term) ||
      r.publisher_name?.toLowerCase().includes(term)
    );
  });

  /* ============================
        UI STARTS HERE
  ============================ */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-5">Traffic Distribution Manager</h1>

      {/* PUB SEARCH */}
      <div className="mb-4 flex gap-3">
        <input
          placeholder="Enter PUB_ID (PUB03)"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
          className="border p-2 rounded w-64"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={loadMeta}>
          Load Publisher
        </button>
        <button className="bg-gray-700 text-white px-4 py-2 rounded" onClick={loadOverview}>
          Load Overview
        </button>
      </div>

      {/* Publisher Info */}
      {publisherDetails && (
        <div className="bg-gray-50 p-4 rounded shadow mb-5">
          <p><strong>PUB:</strong> {publisherDetails.pub_code}</p>
          <p><strong>Name:</strong> {publisherDetails.publisher_name}</p>
          <p><strong>Combos:</strong> {publisherDetails.combos}</p>
        </div>
      )}

      {/* Configure Rules */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Assign Offer to Traffic</h2>

        <div className="flex gap-3 mb-3">
          {/* Tracking */}
          <select
            value={selectedTracking}
            onChange={(e) => setSelectedTracking(Number(e.target.value))}
            className="border p-2 rounded w-1/3"
          >
            <option value="">Select Tracking Link</option>
            {meta.map((m) => (
              <option key={m.tracking_link_id} value={m.tracking_link_id}>
                {m.geo}/{m.carrier} — {m.type}
              </option>
            ))}
          </select>

          {/* Offers */}
          <select
            value={offerId}
            onChange={(e) => setOfferId(Number(e.target.value))}
            className="border p-2 rounded w-1/3"
          >
            <option value="">Select Offer</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.offer_id} — {o.offer_name} ({o.advertiser_name})
              </option>
            ))}
          </select>

          {/* Weight */}
          <input
            type="number"
            value={weight}
            min="1"
            max="100"
            onChange={(e) => setWeight(Number(e.target.value))}
            className="border p-2 rounded w-24"
          />

          {/* Button */}
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={addRule}>
            {isEditing ? "Update" : "Add"}
          </button>
        </div>

        <p className="text-gray-500 text-sm">Remaining %: <strong>{remaining}</strong></p>
      </div>

      {/* Rules Table */}
      <h2 className="font-semibold mb-2">Current Rules</h2>
      <table className="min-w-full text-sm bg-white border mb-10">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Offer</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Type</th>
            <th className="p-2">Weight</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.offer_code} — {r.offer_name}</td>
              <td className="p-2">{r.geo}</td>
              <td className="p-2">{r.carrier}</td>
              <td className="p-2">{r.type}</td>
              <td className="p-2">{r.weight}%</td>
              <td className="p-2">
                <button className="bg-yellow-500 text-white px-2 py-1 rounded mr-2" onClick={() => editRule(r)}>Edit</button>
                <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => delRule(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* GLOBAL OVERVIEW SECTION */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-3">Global Distribution Overview</h2>

        <input
          className="border p-2 rounded w-1/2 mb-3"
          placeholder="Search (PUB, Offer, Advertiser, Publisher)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table className="min-w-full text-sm bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">PUB</th>
              <th className="p-2">Offer</th>
              <th className="p-2">Advertiser</th>
              <th className="p-2">Geo</th>
              <th className="p-2">Carrier</th>
              <th className="p-2">Weight</th>
            </tr>
          </thead>
          <tbody>
            {filteredOverview.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.pub_id}</td>
                <td className="p-2">{r.offer_code}</td>
                <td className="p-2">{r.advertiser_name}</td>
                <td className="p-2">{r.geo}</td>
                <td className="p-2">{r.carrier}</td>
                <td className="p-2">{r.weight}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
