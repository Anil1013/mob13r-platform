// frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";

/* =====================================================================
   CONSTANTS
===================================================================== */

const PARAM_LABELS = {
  ip: "IP",
  ua: "UA",
  sub1: "SUB1",
  sub2: "SUB2",
  sub3: "SUB3",
  sub4: "SUB4",
  sub5: "SUB5",
  device: "DEVICE",
  msisdn: "MSISDN",
  click_id: "CLICK_ID",
};

// order for chips
const PARAM_ORDER = [
  "ip",
  "ua",
  "sub1",
  "sub2",
  "sub3",
  "sub4",
  "sub5",
  "device",
  "msisdn",
  "click_id",
];

/* =====================================================================
   MAIN PAGE
===================================================================== */

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [search, setSearch] = useState("");
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [selectedLinkId, setSelectedLinkId] = useState(null);

  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);

  const [offers, setOffers] = useState([]); // active offers list
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRule, setModalRule] = useState(null);

  /* ---------------------------------------------------------------
     FILTERED LINKS
  --------------------------------------------------------------- */

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return trackingLinks;
    const q = search.toLowerCase();
    return trackingLinks.filter(
      (t) =>
        t.tracking_id.toLowerCase().includes(q) ||
        (t.tracking_url || "").toLowerCase().includes(q) ||
        (t.publisher_name || "").toLowerCase().includes(q)
    );
  }, [search, trackingLinks]);

  /* ---------------------------------------------------------------
     API HELPERS
  --------------------------------------------------------------- */

  const loadTrackingLinks = async () => {
    if (!pubId.trim()) {
      toast.error("Please enter PUB ID");
      return;
    }

    setLoadingLinks(true);
    setSelectedLinkId(null);
    setMeta(null);
    setRules([]);
    setRemaining(0);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${pubId.trim()}`
      );
      if (!res.data?.success) {
        toast.error(res.data?.error || "Failed to load tracking links");
        return;
      }
      setTrackingLinks(res.data.links || []);

      if ((res.data.links || []).length === 1) {
        setSelectedLinkId(res.data.links[0].tracking_link_id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadMeta = async (linkId) => {
    if (!pubId || !linkId) return;
    setLoadingMeta(true);
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${pubId}&tracking_link_id=${linkId}`
      );
      if (res.data?.success) {
        setMeta(res.data.meta);

        // offers load (best-effort, filtered client-side)
        loadOffers(res.data.meta.geo, res.data.meta.carrier);
      } else {
        setMeta(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load overview");
    } finally {
      setLoadingMeta(false);
    }
  };

  const loadRules = async (linkId) => {
    if (!pubId || !linkId) return;
    setLoadingRules(true);
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId}&tracking_link_id=${linkId}`
      );
      if (res.data?.success) {
        setRules(res.data.rules || []);
      } else {
        setRules([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load rules");
    } finally {
      setLoadingRules(false);
    }
  };

  const loadRemaining = async (linkId) => {
    if (!pubId || !linkId) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${linkId}`
      );
      if (res.data?.success) {
        setRemaining(Number(res.data.remaining || 0));
      } else {
        setRemaining(0);
      }
    } catch (e) {
      console.error(e);
      setRemaining(0);
    }
  };

  // best-effort offers loader (works even if backend shape is a bit different)
  const loadOffers = async (geo, carrier) => {
    try {
      const res = await apiClient.get(`/offers?status=active`);
      let list =
        res.data?.offers ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);
      if (!Array.isArray(list)) list = [];

      // client-side filter by geo & carrier if fields present
      const g = (geo || "").toUpperCase();
      const c = (carrier || "").toUpperCase();
      const filtered = list.filter((o) => {
        const og = (o.geo || "").toUpperCase();
        const oc = (o.carrier || "").toUpperCase();
        const st = (o.status || "").toLowerCase();
        const geoMatch = !og || og === g;
        const carrierMatch = !oc || oc === c;
        const active = !st || st === "active";
        return geoMatch && carrierMatch && active;
      });

      setOffers(filtered);
    } catch (e) {
      console.error("Offers load error", e);
      setOffers([]);
      // do not toast here every time – offers are optional
    }
  };

  /* ---------------------------------------------------------------
     EFFECT: when selectedLinkId changes
  --------------------------------------------------------------- */

  useEffect(() => {
    if (!selectedLinkId) return;
    loadMeta(selectedLinkId);
    loadRules(selectedLinkId);
    loadRemaining(selectedLinkId);
  }, [selectedLinkId]);

  /* ---------------------------------------------------------------
     PARAM TOGGLE HANDLER
  --------------------------------------------------------------- */

  const handleParamToggle = async (key) => {
    if (!meta) return;
    const current = meta.required_params || {};
    const updated = {
      ...current,
      [key]: !current[key],
    };

    // optimistic UI
    setMeta((prev) =>
      prev ? { ...prev, required_params: updated } : prev
    );

    try {
      await apiClient.put(
        `/distribution/update-required-params/${meta.tracking_link_id}`,
        { required_params: updated }
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to save parameters");
      // revert on error
      setMeta((prev) =>
        prev ? { ...prev, required_params: current } : prev
      );
    }
  };

  /* ---------------------------------------------------------------
     PREVIEW URL (base tracking_url + required params)
  --------------------------------------------------------------- */

  const previewUrl = useMemo(() => {
    if (!meta?.tracking_url) return "";
    try {
      const url = new URL(meta.tracking_url);
      const params = url.searchParams;
      const req = meta.required_params || {};

      Object.entries(req).forEach(([key, enabled]) => {
        if (enabled) {
          if (!params.has(key)) {
            params.set(key, `<${key.toUpperCase()}>`);
          }
        } else {
          params.delete(key);
        }
      });

      const qs = params.toString();
      return url.origin + url.pathname + (qs ? "?" + qs : "");
    } catch (e) {
      // in case tracking_url is not absolute
      return meta.tracking_url;
    }
  }, [meta]);

  /* ---------------------------------------------------------------
     MODAL OPEN / CLOSE
  --------------------------------------------------------------- */

  const openAddRule = () => {
    if (!selectedLinkId) {
      toast.error("Select a tracking link first");
      return;
    }
    setModalRule(null);
    setModalOpen(true);
  };

  const openEditRule = (rule) => {
    setModalRule(rule);
    setModalOpen(true);
  };

  const handleRuleSaved = async () => {
    await loadRules(selectedLinkId);
    await loadRemaining(selectedLinkId);
    setModalOpen(false);
  };

  /* =====================================================================
     RENDER
  ===================================================================== */

  return (
    <div className="p-6 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Traffic Distribution
          </h1>
          <p className="text-sm text-gray-500">
            Manage rotation rules, required parameters & offer caps per
            publisher tracking link.
          </p>
        </div>
      </div>

      {/* PUB INPUT */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Publisher ID
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. PUB01"
            value={pubId}
            onChange={(e) => setPubId(e.target.value.toUpperCase())}
          />
        </div>
        <button
          onClick={loadTrackingLinks}
          disabled={loadingLinks}
          className="mt-1 md:mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {loadingLinks ? "Loading..." : "Load"}
        </button>
      </div>

      {/* SEARCH + LINKS */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* LEFT: TRACKING LINKS LIST */}
        <div className="md:col-span-1 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Search tracking links
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search by ID, URL or publisher name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="border rounded-xl bg-white shadow-sm max-h-[420px] overflow-y-auto">
            {filteredLinks.length === 0 && (
              <div className="p-4 text-xs text-gray-500">
                {trackingLinks.length === 0
                  ? "No tracking links loaded yet."
                  : "No tracking links match your search."}
              </div>
            )}

            {filteredLinks.map((t) => {
              const active = selectedLinkId === t.tracking_link_id;
              return (
                <button
                  key={t.tracking_link_id}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition ${
                    active ? "bg-indigo-50 border-l-4 border-indigo-500" : ""
                  }`}
                  onClick={() => setSelectedLinkId(t.tracking_link_id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {t.tracking_id}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[220px]">
                        {t.tracking_url}
                      </div>
                    </div>
                    <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {t.type} • {t.payout}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: OVERVIEW + RULES */}
        <div className="md:col-span-2 space-y-4">
          {/* OVERVIEW CARD */}
          <div className="border rounded-2xl bg-white shadow-sm p-5 min-h-[180px]">
            {loadingMeta && (
              <div className="text-sm text-gray-500">Loading overview...</div>
            )}

            {!loadingMeta && !meta && (
              <div className="text-sm text-gray-400">
                Select a tracking link to see its overview.
              </div>
            )}

            {meta && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold">Overview</h2>
                    <p className="text-xs text-gray-500">
                      Publisher: <b>{meta.pub_code}</b> • GEO:{" "}
                      <b>{meta.geo}</b> • Carrier: <b>{meta.carrier}</b>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Remaining Weight</p>
                    <p
                      className={`text-lg font-semibold ${
                        remaining === 0
                          ? "text-red-600"
                          : remaining === 100
                          ? "text-yellow-500"
                          : "text-emerald-600"
                      }`}
                    >
                      {remaining}%
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Tracking URL
                  </p>
                  <div className="text-xs bg-gray-50 border rounded-lg px-3 py-2 break-all font-mono">
                    {previewUrl || meta.tracking_url}
                  </div>
                </div>

                {/* REQUIRED PARAMS */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Required Parameters
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PARAM_ORDER.map((key) => {
                      const enabled = meta.required_params?.[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleParamToggle(key)}
                          className={`px-3 py-1 rounded-full text-[11px] font-medium border transition ${
                            enabled
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {PARAM_LABELS[key]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Click to toggle which parameters are required and included
                    in the final click URL.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* RULES CARD */}
          <div className="border rounded-2xl bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">Rules</h2>
                <p className="text-xs text-gray-500">
                  Define offer rotation, GEO/carrier targeting and fallback
                  logic.
                </p>
              </div>
              <button
                onClick={openAddRule}
                disabled={!selectedLinkId}
                className="inline-flex items-center px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                + Add Rule
              </button>
            </div>

            {loadingRules && (
              <div className="text-sm text-gray-500">Loading rules...</div>
            )}

            {!loadingRules && rules.length === 0 && (
              <div className="text-sm text-gray-400">
                No rules configured yet for this tracking link.
              </div>
            )}

            {!loadingRules && rules.length > 0 && (
              <div className="overflow-x-auto -mx-3 mt-1">
                <table className="min-w-full text-xs border-t border-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">
                        Offer
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">
                        GEO
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">
                        Carrier
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">
                        Weight
                      </th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500">
                        Fallback
                      </th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b last:border-b-0 border-gray-100"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.offer_id}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.geo}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.carrier}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {r.weight}%
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.is_fallback ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                              YES
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">
                              NO
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              r.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : r.status === "paused"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEditRule(r)}
                            className="text-xs text-indigo-600 hover:underline mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  "Are you sure you want to delete this rule?"
                                )
                              )
                                return;
                              try {
                                await apiClient.delete(
                                  `/distribution/rules/${r.id}`
                                );
                                toast.success("Rule deleted");
                                loadRules(selectedLinkId);
                                loadRemaining(selectedLinkId);
                              } catch (e) {
                                console.error(e);
                                toast.error("Failed to delete rule");
                              }
                            }}
                            className="text-xs text-red-600 hover:underline"
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
          </div>
        </div>
      </div>

      {/* RULE MODAL */}
      {modalOpen && selectedLinkId && (
        <RuleModal
          rule={modalRule}
          pubId={pubId}
          trackingLinkId={selectedLinkId}
          offers={offers}
          remaining={remaining}
          onSaved={handleRuleSaved}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

/* =====================================================================
   INLINE RULE MODAL COMPONENT
===================================================================== */

function RuleModal({ rule, pubId, trackingLinkId, offers, remaining, onSaved, onClose }) {
  const [offerId, setOfferId] = useState(rule?.offer_id || "");
  const [geo, setGeo] = useState(rule?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || "ALL");
  const [weight, setWeight] = useState(
    rule?.weight !== undefined && rule?.weight !== null
      ? String(rule.weight)
      : ""
  );
  const [fallback, setFallback] = useState(!!rule?.is_fallback);
  const [status, setStatus] = useState(rule?.status || "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!offerId) {
      setError("Offer is required");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      pub_id: pubId,
      tracking_link_id: trackingLinkId,
      offer_id: offerId,
      geo,
      carrier,
      is_fallback: fallback,
      weight: weight ? Number(weight) : null,
      autoFill: !weight,
      status,
    };

    try {
      if (rule) {
        await apiClient.put(`/distribution/rules/${rule.id}`, payload);
        toast.success("Rule updated");
      } else {
        const res = await apiClient.post(`/distribution/rules`, payload);
        if (!res.data?.success && res.data?.error) {
          setError(res.data.error);
          return;
        }
        toast.success("Rule added");
      }
      await onSaved();
    } catch (e) {
      console.error(e);
      setError("Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {rule ? "Edit Rule" : "Add Rule"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Offer */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Offer <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
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
          <p className="text-[10px] text-gray-400 mt-1">
            Only active offers are listed. If empty, you can manually type an
            Offer ID.
          </p>
        </div>

        {/* GEO + Carrier */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              GEO
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={geo}
              onChange={(e) => setGeo(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Carrier
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Weight (remaining: {remaining}%)
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Leave empty for AutoFill"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            If left blank, system will auto-fill remaining % for this tracking
            link.
          </p>
        </div>

        {/* Fallback + Status */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="rounded"
              checked={fallback}
              onChange={(e) => setFallback(e.target.checked)}
            />
            <span>Mark as Fallback rule</span>
          </label>
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              className="border rounded-lg px-2 py-1 text-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="deleted">deleted</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg border text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
