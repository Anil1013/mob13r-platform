import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";

/* ===========================================================
   PAGE START
=========================================================== */

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLink, setSelectedLink] = useState(null);

  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(100);

  const [offers, setOffers] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editRule, setEditRule] = useState(null);

  /* ===========================================================
     LOAD TRACKING LINKS
  ============================================================ */
  const loadTrackingLinks = async () => {
    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${pubId}`
      );
      if (res.data.success) {
        setTrackingLinks(res.data.links);
        toast.success("Publisher loaded");
      }
    } catch {
      toast.error("Failed to load publisher");
    }
  };

  /* ===========================================================
     FILTER LINKS
  ============================================================ */
  const filteredLinks = trackingLinks.filter((t) =>
    t.tracking_id.toLowerCase().includes(search.toLowerCase())
  );

  /* ===========================================================
     LOAD META + RULES
  ============================================================ */
  const loadMeta = async () => {
    if (!selectedLink) return;

    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setMeta(res.data.meta);
    } catch {}
  };

  const loadRules = async () => {
    if (!selectedLink) return;

    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setRules(res.data.rules);
    } catch {}
  };

  const loadRemaining = async () => {
    if (!selectedLink) return;

    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setRemaining(res.data.remaining);
    } catch {}
  };

  useEffect(() => {
    if (selectedLink) {
      loadMeta();
      loadRules();
      loadRemaining();
    }
  }, [selectedLink]);

  /* ===========================================================
     LOAD OFFERS BASED ON GEO + CARRIER
  ============================================================ */
  useEffect(() => {
    if (!meta) return;

    const loadOffers = async () => {
      try {
        const res = await apiClient.get(
          `/distribution/offers?geo=${meta.geo}&carrier=${meta.carrier}`
        );
        if (res.data.success) setOffers(res.data.offers);
      } catch {}
    };
    loadOffers();
  }, [meta]);

  /* ===========================================================
     Required Params Toggle + Update DB
  ============================================================ */
  const toggleParam = async (param) => {
    try {
      const updated = {
        ...meta.required_params,
        [param]: !meta.required_params[param],
      };

      await apiClient.post(
        `/distribution/update-required-params/${meta.tracking_link_id}`,
        updated
      );

      setMeta((m) => ({
        ...m,
        required_params: updated,
      }));
    } catch {
      toast.error("Failed to update parameter");
    }
  };

  /* ===========================================================
     Build FINAL URL PREVIEW
  ============================================================ */
  const buildFinalUrl = () => {
    if (!meta) return "";
    const base = meta.tracking_url;
    const params = meta.required_params || {};

    const active = Object.keys(params)
      .filter((k) => params[k] === true)
      .map((k) => `${k}={${k}}`)
      .join("&");

    return active ? `${base}&${active}` : base;
  };

  /* ===========================================================
     RULE SAVE HANDLER
  ============================================================ */
  const handleRuleSaved = async () => {
    setShowRuleModal(false);
    setEditRule(null);
    await loadRules();
    await loadRemaining();
  };

  /* ===========================================================
     RULE MODAL UI
  ============================================================ */
  const RuleModal = () => {
    const r = editRule;
    const [offerId, setOfferId] = useState(r?.offer_id || "");
    const [geo, setGeo] = useState(r?.geo || meta.geo);
    const [carrier, setCarrier] = useState(r?.carrier || meta.carrier);
    const [weight, setWeight] = useState(r?.weight || "");
    const [fallback, setFallback] = useState(r?.is_fallback || false);
    const [saving, setSaving] = useState(false);

    const save = async () => {
      setSaving(true);

      const payload = {
        pub_id: pubId,
        tracking_link_id: selectedLink,
        offer_id: offerId,
        geo,
        carrier,
        is_fallback: fallback,
        weight: weight || null,
        autoFill: !weight,
      };

      try {
        if (r) {
          await apiClient.put(`/distribution/rules/${r.id}`, payload);
        } else {
          await apiClient.post(`/distribution/rules`, payload);
        }
        handleRuleSaved();
      } catch {
        toast.error("Save failed");
      }
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
          <h2 className="text-xl font-bold">
            {r ? "Edit Rule" : "Add Rule"}
          </h2>

          <div>
            <label>Offer</label>
            <select
              className="border rounded p-2 w-full"
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
            >
              <option value="">Select offer</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label>GEO</label>
              <input
                className="border p-2 w-full"
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label>Carrier</label>
              <input
                className="border p-2 w-full"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label>Weight (Remaining: {remaining}%)</label>
            <input
              className="border p-2 w-full"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={fallback}
              onChange={(e) => setFallback(e.target.checked)}
            />
            <label>Fallback rule</label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 border rounded"
              onClick={() => setShowRuleModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ===========================================================
     PAGE UI
  ============================================================ */
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Traffic Distribution</h1>

      {/* Publisher Load */}
      <div className="flex gap-3">
        <input
          className="border p-2"
          placeholder="PUB01"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={loadTrackingLinks}
        >
          Load
        </button>
      </div>

      {/* Search */}
      <input
        className="border p-2 w-full"
        placeholder="Search tracking links…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Tracking Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredLinks.map((t) => (
          <div
            key={t.tracking_link_id}
            className={`p-3 border rounded cursor-pointer ${
              selectedLink === t.tracking_link_id ? "bg-blue-100" : ""
            }`}
            onClick={() => setSelectedLink(t.tracking_link_id)}
          >
            <p className="font-bold">{t.tracking_id}</p>
            <p className="text-sm text-gray-600">{t.base_url}</p>
          </div>
        ))}
      </div>

      {/* Overview */}
      {meta && (
        <div className="border rounded p-4 bg-gray-50 space-y-3">
          <h2 className="text-lg font-bold">Overview</h2>

          <p><b>Publisher:</b> {meta.pub_code}</p>
          <p><b>GEO:</b> {meta.geo}</p>
          <p><b>Carrier:</b> {meta.carrier}</p>

          <p>
            <b>URL:</b> <span className="text-blue-700">{buildFinalUrl()}</span>
          </p>

          <div>
            <b>Required Params:</b>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.keys(meta.required_params).map((p) => (
                <button
                  key={p}
                  onClick={() => toggleParam(p)}
                  className={`px-3 py-1 text-xs rounded border ${
                    meta.required_params[p]
                      ? "bg-green-600 text-white"
                      : "bg-white"
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RULES */}
      {selectedLink && (
        <div className="border rounded p-4">
          <div className="flex justify-between mb-3">
            <h2 className="text-lg font-bold">Rules</h2>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => setShowRuleModal(true)}
            >
              + Add Rule
            </button>
          </div>

          <table className="w-full border text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Offer</th>
                <th className="p-2 border">GEO</th>
                <th className="p-2 border">Carrier</th>
                <th className="p-2 border">Weight</th>
                <th className="p-2 border">Fallback</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="p-2 border">{r.offer_id}</td>
                  <td className="p-2 border">{r.geo}</td>
                  <td className="p-2 border">{r.carrier}</td>
                  <td className="p-2 border">{r.weight}%</td>
                  <td className="p-2 border">
                    {r.is_fallback ? "YES" : "NO"}
                  </td>

                  <td className="p-2 border flex gap-2">
                    <button
                      className="bg-yellow-500 text-white px-2 py-1 rounded"
                      onClick={() => {
                        setEditRule(r);
                        setShowRuleModal(true);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded"
                      onClick={async () => {
                        await apiClient.delete(`/distribution/rules/${r.id}`);
                        loadRules();
                        loadRemaining();
                      }}
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

      {/* RULE MODAL */}
      {showRuleModal && <RuleModal />}
    </div>
  );
}
