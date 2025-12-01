import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [loading, setLoading] = useState(false);

  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLink, setSelectedLink] = useState(null);

  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [offers, setOffers] = useState([]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);

  /* -------------------------------------------
      Filter tracking links (search bar)
  ------------------------------------------- */
  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links;
    const q = search.toLowerCase();
    return links.filter(
      (l) =>
        (l.tracking_id && l.tracking_id.toLowerCase().includes(q)) ||
        (l.tracking_url && l.tracking_url.toLowerCase().includes(q)) ||
        (l.publisher_name && l.publisher_name.toLowerCase().includes(q))
    );
  }, [search, links]);

  /* -------------------------------------------
      Load tracking links for PUB ID
  ------------------------------------------- */
  const loadTrackingLinks = async () => {
    if (!pubId.trim()) {
      alert("Please enter PUB ID (e.g. PUB02, PUB03)");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setLinks([]);
    setSelectedLink(null);
    setMeta(null);
    setRules([]);
    setOffers([]);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${pubId}`
      );

      if (res.data.success) {
        setLinks(res.data.links || []);
        setMessage(`Loaded ${res.data.links.length} links`);
      } else {
        setError(res.data.error);
      }
    } catch {
      setError("Failed to load tracking links");
    }

    setLoading(false);
  };

  /* -------------------------------------------
      When user selects a link card
  ------------------------------------------- */
  const selectLink = async (link) => {
    setSelectedLink(link);
    setMeta(null);
    setRules([]);
    setRemaining(0);
    setOffers([]);

    try {
      const m = await apiClient.get(
        `/distribution/meta?pub_id=${link.pub_code}&tracking_link_id=${link.tracking_link_id}`
      );
      if (m.data.success) setMeta(m.data.meta);

      const r = await apiClient.get(
        `/distribution/rules?pub_id=${link.pub_code}&tracking_link_id=${link.tracking_link_id}`
      );
      if (r.data.success) setRules(r.data.rules || []);

      const rem = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${link.pub_code}&tracking_link_id=${link.tracking_link_id}`
      );
      if (rem.data.success) setRemaining(rem.data.remaining);

      await loadOffers(link.geo, link.carrier);
    } catch {
      setError("Error loading details");
    }
  };

  /* -------------------------------------------
      Load offers for that GEO + Carrier
  ------------------------------------------- */
  const loadOffers = async (geo, carrier) => {
    try {
      const res = await apiClient.get("/offers/list");
      if (!res.data.success) return;

      const all = res.data.offers;

      const filtered = all.filter((o) => {
        const g = o.geo?.toUpperCase();
        const c = o.carrier?.toUpperCase();
        const targetG = geo.toUpperCase();
        const targetC = carrier.toUpperCase();

        const matchG = g === "ALL" || g === targetG;
        const matchC = c === "ALL" || c === targetC;

        return matchG && matchC && o.status === "active";
      });

      setOffers(filtered);
    } catch {}
  };

  /* -------------------------------------------
      Delete rule
  ------------------------------------------- */
  const deleteRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;

    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      await selectLink(selectedLink);
    } catch {
      alert("Failed to delete rule");
    }
  };

  /* -------------------------------------------
      RENDER REQUIRED PARAMS UI
  ------------------------------------------- */
  const renderRequiredParams = () => {
    if (!meta?.required_params) return null;

    return (
      <div>
        <h4 className="font-semibold mb-1 text-sm">Required Parameters</h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {Object.entries(meta.required_params).map(([key, val]) => (
            <label
              key={key}
              className="flex items-center gap-2 bg-white border rounded px-2 py-1"
            >
              <input type="checkbox" checked={val} readOnly />
              <span className="uppercase">{key}</span>
            </label>
          ))}
        </div>

        <p className="text-[11px] mt-1 text-gray-500">
          Auto-detected + DB saved params. (Read-only)
        </p>
      </div>
    );
  };

  /* ============================================
        MODAL (INLINE) — Add/Edit Rule
  ============================================ */
  const RuleModal = () => {
    if (!modalOpen) return null;

    const [offerId, setOfferId] = useState(editRule?.offer_id || "");
    const [geo, setGeo] = useState(editRule?.geo || meta.geo || "ALL");
    const [carrier, setCarrier] = useState(
      editRule?.carrier || meta.carrier || "ALL"
    );
    const [weight, setWeight] = useState(
      editRule?.weight !== undefined ? String(editRule.weight) : ""
    );
    const [fallback, setFallback] = useState(editRule?.is_fallback || false);
    const [status, setStatus] = useState(editRule?.status || "active");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    const save = async () => {
      if (!offerId) {
        setErr("Offer is required");
        return;
      }

      setSaving(true);
      setErr("");

      const payload = {
        pub_id: selectedLink.pub_code,
        tracking_link_id: selectedLink.tracking_link_id,
        offer_id: offerId,
        geo,
        carrier,
        weight: weight ? Number(weight) : null,
        autoFill: !weight,
        is_fallback: fallback,
        status,
      };

      try {
        if (editRule) {
          await apiClient.put(
            `/distribution/rules/${editRule.id}`,
            payload
          );
        } else {
          await apiClient.post(`/distribution/rules`, payload);
        }

        await selectLink(selectedLink);
        setModalOpen(false);
      } catch {
        setErr("Failed to save rule");
      }

      setSaving(false);
    };

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">
              {editRule ? "Edit Rule" : "Add Rule"}
            </h2>
            <button
              className="text-gray-500"
              onClick={() => setModalOpen(false)}
            >
              ✕
            </button>
          </div>

          {err && (
            <div className="bg-red-100 text-red-700 text-xs p-2 rounded">
              {err}
            </div>
          )}

          {/* OFFER */}
          <div>
            <label className="text-sm font-medium">Offer *</label>
            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="border p-2 rounded w-full text-sm"
            >
              <option value="">Select Offer</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* GEO/CARRIER */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">GEO</label>
              <input
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                className="border p-2 rounded w-full text-sm"
              />
            </div>

            <div>
              <label className="text-sm">Carrier</label>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="border p-2 rounded w-full text-sm"
              />
            </div>
          </div>

          {/* WEIGHT */}
          <div>
            <label className="text-sm">Weight (%)</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="border p-2 rounded w-full text-sm"
              placeholder={`Leave empty for AutoFill (Remaining ${remaining}%)`}
            />
          </div>

          {/* Fallback / Status */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fallback}
                onChange={(e) => setFallback(e.target.checked)}
              />
              Fallback
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border p-2 text-sm rounded"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="deleted">deleted</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ============================================
        MAIN PAGE UI
  ============================================ */
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Traffic Distribution</h2>

      {/* Status banner */}
      {(error || message) && (
        <div
          className={`p-2 text-sm rounded ${
            error ? "bg-red-100 text-red-600" : "bg-green-100 text-green-800"
          }`}
        >
          {error || message}
        </div>
      )}

      {/* PUB Input */}
      <div className="flex gap-3 items-center">
        <input
          className="border p-2 rounded w-64"
          placeholder="Enter PUB02 / PUB03"
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

      {/* Search bar */}
      {links.length > 0 && (
        <input
          className="border p-2 rounded w-full"
          placeholder="Search tracking links..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {/* Tracking Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredLinks.map((l) => (
          <div
            key={l.tracking_link_id}
            onClick={() => selectLink(l)}
            className={`p-3 border rounded cursor-pointer ${
              selectedLink?.tracking_link_id === l.tracking_link_id
                ? "bg-blue-50 border-blue-500"
                : "bg-white"
            }`}
          >
            <p className="font-bold">{l.tracking_id}</p>
            <p className="text-xs">{l.geo} / {l.carrier}</p>
            <p className="text-xs break-all">{l.tracking_url}</p>
          </div>
        ))}
      </div>

      {/* Overview */}
      {meta && (
        <div className="p-4 border rounded bg-gray-50 space-y-3">
          <h3 className="font-bold text-lg">Distribution Overview</h3>

          <p><b>Publisher:</b> {meta.pub_code}</p>
          <p><b>GEO:</b> {meta.geo}</p>
          <p><b>Carrier:</b> {meta.carrier}</p>
          <p><b>Tracking URL:</b> <span className="break-all">{meta.tracking_url}</span></p>
          <p><b>Remaining %:</b> {remaining}%</p>

          {renderRequiredParams()}
        </div>
      )}

      {/* Rules Table */}
      {selectedLink && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Rules</h3>
            <button
              onClick={() => {
                setEditRule(null);
                setModalOpen(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              + Add Rule
            </button>
          </div>

          <table className="w-full border text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Offer</th>
                <th className="border p-2">Geo</th>
                <th className="border p-2">Carrier</th>
                <th className="border p-2">Weight</th>
                <th className="border p-2">Fallback</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2">{r.offer_id}</td>
                  <td className="border p-2">{r.geo}</td>
                  <td className="border p-2">{r.carrier}</td>
                  <td className="border p-2">{r.weight}%</td>
                  <td className="border p-2">{r.is_fallback ? "YES" : "NO"}</td>
                  <td className="border p-2">{r.status}</td>
                  <td className="border p-2">
                    <button
                      className="bg-yellow-500 text-white px-3 py-1 rounded text-xs mr-2"
                      onClick={() => {
                        setEditRule(r);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => deleteRule(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {rules.length === 0 && (
                <tr>
                  <td colSpan={7} className="border text-center p-2">
                    No rules added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {modalOpen && <RuleModal />}
    </div>
  );
}
