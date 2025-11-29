// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  /* --------------------------
      STATE
  -------------------------- */
  const [pubCode, setPubCode] = useState("");
  const [meta, setMeta] = useState([]);
  const [publisher, setPublisher] = useState(null);
  const [selectedTracking, setSelectedTracking] = useState("");

  const [offers, setOffers] = useState([]);
  const [rules, setRules] = useState([]);

  const [offerId, setOfferId] = useState("");
  const [weight, setWeight] = useState(100);
  const [remaining, setRemaining] = useState(100);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [overview, setOverview] = useState([]);
  const [search, setSearch] = useState("");

  /* --------------------------
      LOADERS
  -------------------------- */

  const loadOverview = async () => {
    try {
      const r = await apiClient.get("/distribution/overview");
      setOverview(r.data || []);
    } catch {
      setOverview([]);
    }
  };

  const loadMeta = async () => {
    if (!pubCode) return alert("Enter PUB_ID");

    try {
      const res = await apiClient.get(`/distribution/meta?pub_id=${pubCode}`);
      const rows = res.data || [];
      setMeta(rows);

      if (rows.length) {
        const f = rows[0];
        setSelectedTracking(f.tracking_link_id);
        setPublisher({
          pub_id: f.pub_code,
          publisher_id: f.publisher_id,
          publisher_name: f.publisher_name,
          combos: rows.map((x) => `${x.geo}/${x.carrier}`).join(", "),
        });

        await loadRules(f.pub_code);
        await loadRemaining(f.pub_code, f.tracking_link_id);
      } else {
        setPublisher(null);
        setRules([]);
        setSelectedTracking("");
        setRemaining(100);
      }
    } catch (err) {
      console.error("meta failed", err);
      alert("Failed loading PUB data");
    }
  };

  const loadOffers = async (trackingId = selectedTracking) => {
    if (!trackingId || !meta.length) return;

    const exclude = rules
      .filter((r) => r.tracking_link_id === trackingId)
      .map((r) => r.offer_id)
      .join(",");

    try {
      const res = await apiClient.get(
        `/distribution/offers${exclude ? `?exclude=${exclude}` : ""}`
      );
      setOffers(res.data || []);
    } catch {
      setOffers([]);
    }
  };

  const loadRules = async (pub) => {
    try {
      const res = await apiClient.get(`/distribution/rules?pub_id=${pub}`);
      setRules(res.data || []);
    } catch {
      setRules([]);
    }
  };

  const loadRemaining = async (pub, tracking) => {
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pub}${
          tracking ? `&tracking_link_id=${tracking}` : ""
        }`
      );
      setRemaining(res.data?.remaining ?? 100);
    } catch {
      setRemaining(100);
    }
  };

  /* --------------------------
      EFFECTS
  -------------------------- */

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (publisher?.pub_id) {
      loadOffers(selectedTracking);
      loadRemaining(publisher.pub_id, selectedTracking);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTracking, rules]);

  /* --------------------------
      ACTIONS
  -------------------------- */

  const resetForm = () => {
    setOfferId("");
    setWeight(100);
    setIsEditing(false);
    setEditId(null);
  };

  const addOrUpdateRule = async () => {
    if (!publisher) return alert("Load publisher first");
    if (!selectedTracking) return alert("Select tracking");
    if (!offerId) return alert("Select offer");

    const track = meta.find((m) => m.tracking_link_id === selectedTracking);
    // For add: from offers list; for edit: from rules list
    const offer =
      offers.find((o) => o.id === offerId) ||
      rules.find((x) => x.id === editId) ||
      {};

    const payload = {
      pub_id: publisher.pub_id,
      publisher_id: publisher.publisher_id,
      publisher_name: publisher.publisher_name,
      tracking_link_id: selectedTracking,
      geo: track?.geo,
      carrier: track?.carrier,
      offer_id: offer.id,
      offer_code: offer.offer_id,
      offer_name: offer.offer_name,
      advertiser_name: offer.advertiser_name,
      redirect_url: offer.tracking_url,
      type: offer.type,
      weight: Number(weight),
      created_by: 1,
    };

    try {
      if (isEditing && editId) {
        await apiClient.put(`/distribution/rules/${editId}`, payload);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }

      await loadRules(publisher.pub_id);
      await loadRemaining(publisher.pub_id, selectedTracking);
      await loadOverview();
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    }
  };

  const editRule = (r) => {
    setIsEditing(true);
    setEditId(r.id);
    setSelectedTracking(r.tracking_link_id);
    setOfferId(r.offer_id);
    setWeight(r.weight);
  };

  const removeRule = async (id) => {
    if (!window.confirm("Delete rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      await loadRules(publisher.pub_id);
      await loadRemaining(publisher.pub_id, selectedTracking);
      loadOverview();
    } catch {
      alert("Failed to delete");
    }
  };

  /* --------------------------
      SEARCH FILTER (GLOBAL OVERVIEW)
  -------------------------- */

  const filteredOverview = useMemo(() => {
    if (!search) return overview;

    const q = search.toLowerCase();

    return overview.filter(
      (r) =>
        (r.publisher_name || "").toLowerCase().includes(q) ||
        (r.pub_id || "").toLowerCase().includes(q) ||
        (r.offer_code || "").toLowerCase().includes(q) ||
        (r.offer_name || "").toLowerCase().includes(q) ||
        (r.advertiser_name || "").toLowerCase().includes(q) ||
        (r.geo || "").toLowerCase().includes(q) ||
        (r.carrier || "").toLowerCase().includes(q)
    );
  }, [overview, search]);

  /* --------------------------
      PUBLISHER CLICK URL
  -------------------------- */
  const buildPubUrl = (pub, geo, carrier, click = "{click_id}") => {
    const backend = window.location.origin.replace("dashboard.", "backend.");
    return `${backend}/click?pub_id=${pub}&geo=${geo}&carrier=${carrier}&click_id=${click}`;
  };

  /* --------------------------
      UI
  -------------------------- */
  // For Add Rule dropdown label: GEO/CARRIER of selected tracking
  const selectedTrackRow = meta.find(
    (m) => m.tracking_link_id === selectedTracking
  );
  const selectedGeo = selectedTrackRow?.geo || "-";
  const selectedCarrier = selectedTrackRow?.carrier || "-";

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Traffic Distribution</h1>

      {/* PUB INPUT */}
      <div className="flex gap-3 mb-4">
        <input
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
          className="border p-2 rounded"
          placeholder="PUB03"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={loadMeta}
        >
          Load
        </button>
        <button
          className="bg-gray-700 text-white px-4 py-2 rounded"
          onClick={loadOverview}
        >
          Refresh Overview
        </button>
      </div>

      {/* Publisher Info */}
      {publisher && (
        <div className="bg-gray-100 p-3 rounded mb-5">
          <div>
            <b>PUB:</b> {publisher.pub_id}
          </div>
          <div>
            <b>Publisher:</b> {publisher.publisher_name}
          </div>
          <div>
            <b>Combos:</b> {publisher.combos}
          </div>
          <div>
            <b>Remaining:</b> {remaining}%
          </div>
          <div className="text-xs mt-2 font-mono bg-white p-2">
            {buildPubUrl(publisher.pub_id, meta[0].geo, meta[0].carrier)}
          </div>
        </div>
      )}

      {/* ADD RULE */}
      {publisher && !isEditing && (
        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="font-semibold mb-2">Add Rule</h2>

          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={selectedTracking}
              onChange={(e) => setSelectedTracking(Number(e.target.value))}
              className="border p-2 rounded"
            >
              {meta.map((m) => (
                <option key={m.tracking_link_id} value={m.tracking_link_id}>
                  {m.geo}/{m.carrier}
                </option>
              ))}
            </select>

            <select
              value={offerId}
              onChange={(e) => setOfferId(Number(e.target.value))}
              className="border p-2 rounded min-w-[260px]"
            >
              <option value="">Select Offer</option>
              {offers
                .slice()
                .sort((a, b) => a.offer_name.localeCompare(b.offer_name))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.offer_name} — {o.advertiser_name} — {selectedGeo} —{" "}
                    {selectedCarrier}
                  </option>
                ))}
            </select>

            <input
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              type="number"
              min={1}
              max={100}
              className="border p-2 rounded w-20"
            />

            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={addOrUpdateRule}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* EDIT RULE */}
      {publisher && isEditing && (
        <div className="bg-yellow-50 p-4 rounded shadow mb-6">
          <h2 className="font-semibold mb-2">Edit Rule</h2>

          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={selectedTracking}
              disabled
              className="border p-2 rounded bg-gray-200"
            >
              {meta.map((m) => (
                <option key={m.tracking_link_id} value={m.tracking_link_id}>
                  {m.geo}/{m.carrier}
                </option>
              ))}
            </select>

            <select
              value={offerId}
              disabled
              className="border p-2 rounded bg-gray-200 min-w-[260px]"
            >
              <option>{offerId}</option>
            </select>

            <input
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              type="number"
              min={1}
              max={100}
              className="border p-2 rounded w-20"
            />

            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={addOrUpdateRule}
            >
              Update
            </button>

            <button className="px-3 py-2 rounded border" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CURRENT RULES */}
      {publisher && (
        <div className="mb-8">
          <h2 className="font-semibold mb-2">Current Rules</h2>
          <table className="w-full bg-white text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Offer</th>
                <th className="p-2">Geo</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">Weight</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">
                    {r.offer_code} — {r.offer_name}
                  </td>
                  <td className="p-2">{r.geo}</td>
                  <td className="p-2">{r.carrier}</td>
                  <td className="p-2">{r.weight}%</td>
                  <td className="p-2">
                    <button
                      className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                      onClick={() => editRule(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded"
                      onClick={() => removeRule(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GLOBAL OVERVIEW */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="font-semibold mb-2">Global Overview</h2>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by publisher, offer, advertiser, geo, carrier..."
          className="border p-2 rounded w-full mb-3"
        />

        <table className="w-full bg-white text-xs border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Publisher</th>
              <th className="p-2">Offer Code</th>
              <th className="p-2">Offer Name</th>
              <th className="p-2">Advertiser</th>
              <th className="p-2">Geo</th>
              <th className="p-2">Carrier</th>
              <th className="p-2">Weight</th>
              <th className="p-2">Sample URL</th>
            </tr>
          </thead>
          <tbody>
            {filteredOverview.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.publisher_name}</td>
                <td className="p-2">{r.offer_code}</td>
                <td className="p-2">{r.offer_name}</td>
                <td className="p-2">{r.advertiser_name}</td>
                <td className="p-2">{r.geo}</td>
                <td className="p-2">{r.carrier}</td>
                <td className="p-2">{r.weight}%</td>
                <td className="p-2 font-mono break-all">
                  {buildPubUrl(r.pub_id, r.geo, r.carrier)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
