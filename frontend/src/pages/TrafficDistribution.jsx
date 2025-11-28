// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  /* -----------------------------------
      STATE
  ----------------------------------- */
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

  /* -----------------------------------
      LOAD METHODS
  ----------------------------------- */

  const loadOverview = async () => {
    try {
      const res = await apiClient.get("/distribution/overview");
      setOverview(res.data || []);
    } catch {
      setOverview([]);
    }
  };

  const loadMeta = async () => {
    if (!pubCode) return alert("Enter PUB_ID (Example: PUB03)");

    try {
      const res = await apiClient.get(`/distribution/meta?pub_id=${pubCode}`);
      const rows = res.data || [];
      setMeta(rows);

      if (rows.length) {
        const first = rows[0];
        setSelectedTracking(first.tracking_link_id);
        setPublisher({
          pub_id: first.pub_code,
          publisher_id: first.publisher_id,
          publisher_name: first.publisher_name,
          combos: rows.map((r) => `${r.geo}/${r.carrier}`).join(", "),
        });

        await loadRules(first.pub_code);
        await loadRemaining(first.pub_code, first.tracking_link_id);
      } else {
        setPublisher(null);
        setRules([]);
        setSelectedTracking("");
        setRemaining(100);
      }
    } catch (err) {
      console.error(err);
      alert("Failed loading PUB data");
    }
  };

  const loadOffers = async (trackingId = selectedTracking) => {
    if (!trackingId || !meta.length) return;

    const exclude = rules
      .filter((r) => Number(r.tracking_link_id) === Number(trackingId))
      .map((x) => x.offer_id)
      .join(",");

    try {
      const res = await apiClient.get(`/distribution/offers${exclude ? `?exclude=${exclude}` : ""}`);
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
        `/distribution/rules/remaining?pub_id=${pub}${tracking ? `&tracking_link_id=${tracking}` : ""}`
      );
      setRemaining(res.data?.remaining ?? 100);
    } catch {
      setRemaining(100);
    }
  };

  /* -----------------------------------
      EFFECTS
  ----------------------------------- */

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (publisher?.pub_id) {
      loadOffers(selectedTracking);
      loadRemaining(publisher.pub_id, selectedTracking);
    }
  }, [selectedTracking, rules]);

  /* -----------------------------------
      ACTIONS
  ----------------------------------- */

  const resetForm = () => {
    setOfferId("");
    setWeight(100);
    setIsEditing(false);
    setEditId(null);
  };

  const addOrUpdateRule = async () => {
    if (!publisher) return alert("Load publisher first");
    if (!selectedTracking) return alert("Select tracking link");
    if (!offerId) return alert("Select offer");

    const track = meta.find((m) => m.tracking_link_id === selectedTracking);
    const offer = offers.find((o) => o.id === offerId);

    const payload = {
      pub_id: publisher.pub_id,
      publisher_id: publisher.publisher_id,
      publisher_name: publisher.publisher_name,
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
      created_by: 1,
    };

    try {
      if (isEditing) {
        await apiClient.put(`/distribution/rules/${editId}`, payload);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }

      await loadRules(publisher.pub_id);
      await loadOffers(selectedTracking);
      await loadRemaining(publisher.pub_id, selectedTracking);
      resetForm();
      loadOverview();
    } catch (err) {
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

  /* -----------------------------------
      SEARCH
  ----------------------------------- */
  const filteredOverview = useMemo(() => {
    if (!search) return overview;
    const q = search.toLowerCase();
    return overview.filter(
      (x) =>
        x.pub_id.toLowerCase().includes(q) ||
        x.offer_code?.toLowerCase().includes(q) ||
        x.offer_name?.toLowerCase().includes(q)
    );
  }, [overview, search]);

  /* -----------------------------------
      CLICK URL BUILDER
  ----------------------------------- */
  const buildPubUrl = (pub, geo, carrier, click = "{click_id}") => {
    const backend = window.location.origin.replace("dashboard.", "backend.");
    return `${backend}/click?pub_id=${pub}&geo=${geo}&carrier=${carrier}&click_id=${click}`;
  };

  /* -----------------------------------
      UI
  ----------------------------------- */
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Traffic Distribution</h1>

      {/* Load Publisher */}
      <div className="flex gap-3 mb-4">
        <input
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
          className="border p-2 rounded"
          placeholder="PUB03"
        />
        <button onClick={loadMeta} className="bg-blue-600 text-white px-4 py-2 rounded">
          Load
        </button>
        <button onClick={loadOverview} className="bg-gray-700 text-white px-4 py-2 rounded">
          Refresh Overview
        </button>
      </div>

      {/* Publisher Details */}
      {publisher && (
        <div className="bg-gray-100 p-3 rounded mb-5">
          <div><b>PUB:</b> {publisher.pub_id}</div>
          <div><b>Publisher:</b> {publisher.publisher_name}</div>
          <div><b>Combos:</b> {publisher.combos}</div>
          <div><b>Remaining:</b> {remaining}%</div>
          <div className="text-xs mt-2 font-mono bg-white p-2">
            {buildPubUrl(publisher.pub_id, meta[0].geo, meta[0].carrier)}
          </div>
        </div>
      )}

      {/* Add / Update Rule */}
      {publisher && (
        <div className="bg-white p-4 shadow rounded mb-6">
          <h2 className="font-semibold mb-2">{isEditing ? "Update Rule" : "Add Rule"}</h2>

          <div className="flex gap-3 items-center">
            {/* Tracking */}
            <select
              value={selectedTracking}
              onChange={(e) => setSelectedTracking(Number(e.target.value))}
              className="border p-2 rounded"
            >
              <option value="">Select Tracking</option>
              {meta.map((m) => (
                <option key={m.tracking_link_id} value={m.tracking_link_id}>
                  {m.geo}/{m.carrier}
                </option>
              ))}
            </select>

            {/* Offer */}
            <select
              value={offerId}
              onChange={(e) => setOfferId(Number(e.target.value))}
              className="border p-2 rounded"
            >
              <option value="">Select Offer</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.offer_id} — {o.offer_name}
                </option>
              ))}
            </select>

            {/* Weight */}
            <input
              type="number"
              value={weight}
              min={1}
              max={100}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="border p-2 rounded w-20"
            />

            <button onClick={addOrUpdateRule} className="bg-green-600 text-white px-4 py-2 rounded">
              {isEditing ? "Update" : "Add"}
            </button>

            {isEditing && (
              <button onClick={resetForm} className="border px-3 py-2 rounded">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Current Rules */}
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
                  <td className="p-2">{r.offer_code} - {r.offer_name}</td>
                  <td className="p-2">{r.geo}</td>
                  <td className="p-2">{r.carrier}</td>
                  <td className="p-2">{r.weight}%</td>
                  <td className="p-2">
                    <button className="bg-yellow-500 text-white px-2 py-1 rounded mr-2" onClick={() => editRule(r)}>
                      Edit
                    </button>
                    <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => removeRule(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Overview */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="font-semibold mb-2">Global Overview</h2>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full mb-3"
          placeholder="Search..."
        />

        <table className="w-full bg-white text-xs border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">PUB</th>
              <th className="p-2">Offer</th>
              <th className="p-2">Weight</th>
              <th className="p-2">Sample URL</th>
            </tr>
          </thead>
          <tbody>
            {filteredOverview.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.pub_id}</td>
                <td className="p-2">{r.offer_code}</td>
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
