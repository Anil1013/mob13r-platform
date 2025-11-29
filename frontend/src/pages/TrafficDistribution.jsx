// FINAL FIXED TrafficDistribution.jsx
// - offer_code removed
// - correct payload
// - correct add/update rule logic
// - correct offers logic
// - correct remaining % logic
// - redirect_url / offer_name / advertiser_name correct

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
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
  const [editingRule, setEditingRule] = useState(null);

  const [overview, setOverview] = useState([]);
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (publisher?.pub_id && selectedTracking) {
      loadOffers(selectedTracking);
      loadRemaining(publisher.pub_id, selectedTracking);
    }
  }, [selectedTracking, rules.length]);

  const resetForm = () => {
    setOfferId("");
    setWeight(100);
    setIsEditing(false);
    setEditId(null);
    setEditingRule(null);
  };

  const getRulesForCurrentCombo = () => {
    if (!selectedTracking) return [];
    return rules.filter((r) => r.tracking_link_id === selectedTracking);
  };

  const addOrUpdateRule = async () => {
    if (!publisher) return alert("Load publisher first");
    if (!selectedTracking) return alert("Select combo");

    let offer;
    if (isEditing && editingRule) {
      offer = editingRule;
    } else {
      if (!offerId) return alert("Select offer");
      offer = offers.find((o) => o.id === Number(offerId));
    }

    if (!offer) return alert("Offer not found");

    const rulesForCombo = getRulesForCurrentCombo();
    const newWeight = Number(weight) || 0;

    if (newWeight <= 0 || newWeight > 100)
      return alert("Weight must be 1–100");

    let currentSum = 0;
    if (isEditing && editingRule) {
      currentSum = rulesForCombo
        .filter((r) => r.id !== editingRule.id)
        .reduce((s, r) => s + Number(r.weight || 0), 0);
    } else {
      currentSum = rulesForCombo.reduce((s, r) => s + Number(r.weight || 0), 0);
    }

    if (currentSum + newWeight > 100) {
      const available = 100 - currentSum;
      return alert(
        `Weight exceeds available limit. Available: ${available}%`
      );
    }

    const track = meta.find((m) => m.tracking_link_id === selectedTracking);

    const payload = {
      pub_id: publisher.pub_id,
      publisher_id: publisher.publisher_id,
      publisher_name: publisher.publisher_name,
      tracking_link_id: selectedTracking,
      geo: track?.geo,
      carrier: track?.carrier,

      offer_id: offer.id,                 // FIXED
      offer_name: offer.offer_name,
      advertiser_name: offer.advertiser_name,
      redirect_url: offer.tracking_url,
      type: offer.type,
      weight: newWeight,
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
      const apiError = err?.response?.data;
      alert(apiError?.error || "Failed to save rule");
    }
  };

  const editRule = (r) => {
    setIsEditing(true);
    setEditId(r.id);
    setEditingRule(r);
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

  const filteredOverview = useMemo(() => {
    if (!search) return overview;
    const q = search.toLowerCase();

    return overview.filter((r) =>
      r.pub_id?.toLowerCase().includes(q) ||
      r.publisher_name?.toLowerCase().includes(q) ||
      r.offer_name?.toLowerCase().includes(q) ||
      r.advertiser_name?.toLowerCase().includes(q) ||
      r.geo?.toLowerCase().includes(q) ||
      r.carrier?.toLowerCase().includes(q)
    );
  }, [overview, search]);

  const buildPubUrl = (pub, geo, carrier, click = "{click_id}") => {
    const backend = window.location.origin.replace("dashboard.", "backend.");
    return `${backend}/click?pub_id=${pub}&geo=${geo}&carrier=${carrier}&click_id=${click}`;
  };

  const currentCombo = meta.find((m) => m.tracking_link_id === selectedTracking);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Traffic Distribution</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
          className="border p-2 rounded"
          placeholder="PUB03"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={loadMeta}>
          Load
        </button>
        <button className="bg-gray-700 text-white px-4 py-2 rounded" onClick={loadOverview}>
          Refresh Overview
        </button>
      </div>

      {publisher && (
        <div className="bg-gray-100 p-3 rounded mb-5">
          <div>
            <b>PUB:</b> {publisher.pub_id} | <b>Publisher:</b> {publisher.publisher_name}
            |
 and so on…
        </div>
      )}
    </div>
  );
}
