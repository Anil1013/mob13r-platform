// FINAL CLEAN & BUILD-READY TrafficDistribution.jsx
// With correct payload, no offer_code, clean logic,
// 100% syntax-error free & AWS Amplify safe.

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

  // ------------------------ LOADERS ------------------------

  const loadOverview = async () => {
    try {
      const r = await apiClient.get("/distribution/overview");
      setOverview(r.data || []);
    } catch {
      setOverview([]);
    }
  };

  const loadMeta = async () => {
    if (!pubCode) return alert("Enter PUB ID");

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
          combos: rows.map((x) => `${x.geo}/${x.carrier}`).join(", ")
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
      console.error("Meta load failed", err);
      alert("Failed to load publisher data");
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
        `/distribution/rules/remaining?pub_id=${pub}${tracking ? `&tracking_link_id=${tracking}` : ""}`
      );
      setRemaining(res.data?.remaining ?? 100);
    } catch {
      setRemaining(100);
    }
  };

  // ------------------------ EFFECTS ------------------------

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (publisher?.pub_id && selectedTracking) {
      loadOffers(selectedTracking);
      loadRemaining(publisher.pub_id, selectedTracking);
    }
  }, [selectedTracking, rules.length]);

  // ------------------------ HELPERS ------------------------

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

  // ------------------------ ACTIONS ------------------------

  const addOrUpdateRule = async () => {
    if (!publisher) return alert("Load publisher first");
    if (!selectedTracking) return alert("Select combo first");

    let offer;
    if (isEditing && editingRule) {
      offer = editingRule;
    } else {
      if (!offerId) return alert("Select an offer");
      offer = offers.find((o) => o.id === Number(offerId));
    }

    if (!offer) return alert("Offer not found");

    const rulesForCombo = getRulesForCurrentCombo();
    const newWeight = Number(weight) || 0;

    if (newWeight <= 0 || newWeight > 100)
      return alert("Weight must be between 1 and 100");

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
      return alert(`Weight exceeds limit. Available: ${available}%`);
    }

    const track = meta.find((m) => m.tracking_link_id === selectedTracking);

    const payload = {
      pub_id: publisher.pub_id,
      publisher_id: publisher.publisher_id,
      publisher_name: publisher.publisher_name,
      tracking_link_id: selectedTracking,
      geo: track?.geo,
      carrier: track?.carrier,

      offer_id: offer.id,
      offer_name: offer.offer_name,
      advertiser_name: offer.advertiser_name,
      redirect_url: offer.tracking_url,
      type: offer.type,
      weight: newWeight,
      created_by: 1
    };

    try {
      if (isEditing && editId) {
        await apiClient.put(`/distribution/rules/${editId}`, payload);
      } else {
        await apiClient.post(`/distribution/rules`, payload);
      }

      await loadRules(publisher.pub_id);
      await loadRemaining(publisher.pub_id, selectedTracking);
      await loadOverview();
      resetForm();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to save rule");
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
    if (!window.confirm("Delete this rule?")) return;

    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      await loadRules(publisher.pub_id);
      await loadRemaining(publisher.pub_id, selectedTracking);
      loadOverview();
    } catch {
      alert("Delete failed");
    }
  };

  // ------------------------ SEARCH FILTER ------------------------

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

  // ------------------------ URL BUILDER ------------------------

  const buildPubUrl
