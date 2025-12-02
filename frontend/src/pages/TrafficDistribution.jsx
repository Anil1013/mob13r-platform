// frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";
import {
  Plus,
  Copy,
  RefreshCw,
  Search,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";

/* --------------------------------------------------------
   CONSTANTS
-------------------------------------------------------- */

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

const PARAM_PLACEHOLDERS = {
  ip: "{IP}",
  ua: "{UA}",
  sub1: "{SUB1}",
  sub2: "{SUB2}",
  sub3: "{SUB3}",
  sub4: "{SUB4}",
  sub5: "{SUB5}",
  device: "{DEVICE}",
  msisdn: "{MSISDN}",
  click_id: "{CLICK_ID}",
};

/* --------------------------------------------------------
   UTILS
-------------------------------------------------------- */

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function buildFinalUrl(baseUrl, requiredParams) {
  if (!baseUrl) return "";

  const activeParams = Object.entries(requiredParams || {})
    .filter(([, v]) => v)
    .map(([key]) => {
      const paramName = key;
      const placeholder = PARAM_PLACEHOLDERS[key] || `{${key.toUpperCase()}}`;
      return `${encodeURIComponent(paramName)}=${placeholder}`;
    });

  if (!activeParams.length) return baseUrl;

  const hasQuery = baseUrl.includes("?");
  return `${baseUrl}${hasQuery ? "&" : "?"}${activeParams.join("&")}`;
}

/* --------------------------------------------------------
   MAIN
-------------------------------------------------------- */

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("PUB03");
  const [search, setSearch] = useState("");
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const [selectedLink, setSelectedLink] = useState(null);
  const [meta, setMeta] = useState(null);

  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);

  const [requiredParams, setRequiredParams] = useState({});
  const [savingParams, setSavingParams] = useState(false);

  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [savingRule, setSavingRule] = useState(false);

  /* --------------------------------------------------------
     FILTERED LINK LIST
  -------------------------------------------------------- */

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links;
    const q = search.toLowerCase();

    return links.filter(
      (l) =>
        (l.tracking_id || "").toLowerCase().includes(q) ||
        (l.publisher_name || "").toLowerCase().includes(q) ||
        (l.tracking_url || "").toLowerCase().includes(q)
    );
  }, [links, search]);

  const finalTrackingUrl = useMemo(
    () =>
      buildFinalUrl(meta?.tracking_url || selectedLink?.tracking_url || "", requiredParams),
    [meta, selectedLink, requiredParams]
  );

  /* --------------------------------------------------------
     LOADERS
  -------------------------------------------------------- */

  const loadTrackingLinks = async () => {
    if (!pubId.trim()) {
      toast.error("Publisher ID required");
      return;
    }

    setLoadingLinks(true);
    setSelectedLink(null);
    setMeta(null);
    setRules([]);
    setPreview(null);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${encodeURIComponent(pubId.trim())}`
      );

      if (!res.data?.success) {
        toast.error(res.data?.error || "Failed to load links");
        return;
      }

      setLinks(res.data.links || []);
      if (!res.data.links?.length) {
        toast.info("No tracking links for this publisher");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadMeta = async (link) => {
    if (!link) return;
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${encodeURIComponent(
          pubId.trim()
        )}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) {
        setMeta(res.data.meta);
        setRequiredParams(res.data.meta.required_params || {});
      } else {
        toast.error(res.data?.error || "Meta fetch failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading overview");
    }
  };

  const loadRules = async (link) => {
    if (!link) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${encodeURIComponent(
          pubId.trim()
        )}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) setRules(res.data.rules || []);
      else toast.error(res.data?.error || "Failed loading rules");
    } catch (e) {
      console.error(e);
      toast.error("Error loading rules");
    }
  };

  const loadRemaining = async (link) => {
    if (!link) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${encodeURIComponent(
          pubId.trim()
        )}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) setRemaining(res.data.remaining ?? 0);
    } catch (e) {
      console.error(e);
    }
  };

  const loadOffers = async (linkMeta) => {
    if (!linkMeta) return;
    setLoadingOffers(true);
    setOffers([]);

    try {
      const res = await apiClient.get("/distribution/offers", {
        params: {
          pub_id: pubId.trim(),
          geo: linkMeta.geo,
          carrier: linkMeta.carrier,
        },
      });

      const list = res.data?.offers || [];
      setOffers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load offers");
    } finally {
      setLoadingOffers(false);
    }
  };

  const refreshAllForLink = async (link) => {
    if (!link) return;

    await Promise.all([loadMeta(link), loadRules(link), loadRemaining(link)]);

    setTimeout(() => {
      setMeta((m) => {
        if (m) loadOffers(m);
        return m;
      });
    }, 0);
  };

  const handleSelectLink = async (link) => {
    setSelectedLink(link);
    setPreview(null);
    await refreshAllForLink(link);
  };

  /* --------------------------------------------------------
     PARAM REQUIRED TOGGLE
  -------------------------------------------------------- */

  const handleToggleParam = async (key) => {
    if (!selectedLink) return;

    const next = { ...(requiredParams || {}), [key]: !requiredParams[key] };
    setRequiredParams(next);

    setSavingParams(true);
    try {
      await apiClient.put(
        `/distribution/update-required-params/${selectedLink.tracking_link_id}`,
        { required_params: next }
      );
    } catch (e) {
      toast.error("Failed saving parameters");
    } finally {
      setSavingParams(false);
    }
  };

  /* --------------------------------------------------------
     COPY URL
  -------------------------------------------------------- */

  const handleCopyUrl = async () => {
    if (!finalTrackingUrl) return;
    try {
      await navigator.clipboard.writeText(finalTrackingUrl);
      toast.success("URL Copied");
    } catch (e) {
      toast.error("Copy failed");
    }
  };

  /* --------------------------------------------------------
     PREVIEW
  -------------------------------------------------------- */

  const runPreview = async () => {
    if (!selectedLink || !meta) return;

    setPreviewLoading(true);
    setPreview(null);

    try {
      const res = await apiClient.get("/distribution/rotation/preview", {
        params: {
          pub_id: pubId.trim(),
          tracking_link_id: selectedLink.tracking_link_id,
          geo: meta.geo,
          carrier: meta.carrier,
        },
      });

      if (res.data?.success) setPreview(res.data);
      else toast.error(res.data?.error || "Preview failed");
    } catch (e) {
      toast.error("Preview crashed");
    } finally {
      setPreviewLoading(false);
    }
  };

  /* --------------------------------------------------------
     RULE CREATE / EDIT
  -------------------------------------------------------- */

  const openAddRule = () => {
    if (!selectedLink) {
      toast.error("Select a tracking link first");
      return;
    }
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const saveRule = async (form) => {
    if (!selectedLink) return;

    setSavingRule(true);

    try {
      const payload = {
        pub_id: pubId.trim(),
        tracking_link_id: selectedLink.tracking_link_id,
        offer_id: form.offerId, // NOW ALWAYS OFF01 / OFF02
        geo: form.geo || "ALL",
        carrier: form.carrier || "ALL",
        is_fallback: form.fallback,
        weight: form.weight ? Number(form.weight) : null,
        autoFill: !form.weight,
        status: form.status,
      };

      if (!payload.offer_id) {
        toast.error("Offer is required");
        setSavingRule(false);
        return;
      }

      if (editingRule) {
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
        toast.success("Rule updated");
      } else {
        await apiClient.post("/distribution/rules", payload);
        toast.success("Rule added");
      }

      setShowRuleModal(false);
      setEditingRule(null);
      await Promise.all([loadRules(selectedLink), loadRemaining(selectedLink)]);
    } catch (e) {
      toast.error("Failed saving rule");
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      toast.success("Deleted");
      await Promise.all([loadRules(selectedLink), loadRemaining(selectedLink)]);
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  useEffect(() => {}, []);

  /* --------------------------------------------------------
     RENDER UI
  -------------------------------------------------------- */

  return (
    <div className="p-6 space-y-6">

            {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Traffic Distribution</h1>
          <p className="text-sm text-gray-500">
            Manage rotation rules, required params & offer mapping
          </p>
        </div>
      </div>

      {/* TOP BAR */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold">Publisher ID</label>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={pubId}
            onChange={(e) => setPubId(e.target.value)}
          />
        </div>

        <button
          onClick={loadTrackingLinks}
          disabled={loadingLinks}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm"
        >
          {loadingLinks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Load
        </button>

        <div className="flex-1 md:max-w-md">
          <label className="text-xs font-semibold">Search</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="w-full rounded-md border pl-8 py-2 text-sm"
              placeholder="ID, URL or publisher name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT PANEL */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-gray-500" /> Tracking Links
          </h2>

          <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
            {filteredLinks.map((link) => {
              const active =
                selectedLink?.tracking_link_id === link.tracking_link_id;

              return (
                <button
                  key={link.tracking_link_id}
                  onClick={() => handleSelectLink(link)}
                  className={
                    active
                      ? "border border-blue-500 bg-blue-50 w-full text-left px-3 py-2 rounded-lg"
                      : "border border-gray-200 w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50/40"
                  }
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">{link.tracking_id}</span>
                    <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded-full">
                      {link.type} · {link.payout}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{link.geo} · {link.carrier}</span>
                    <span>{link.publisher_name}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{link.tracking_url}</p>
                </button>
              );
            })}

            {!loadingLinks && !links.length && (
              <p className="text-xs text-gray-400">
                Enter a Publisher ID & click Load.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-4 lg:col-span-2">
          {/* OVERVIEW CARD */}
          <div className="rounded-xl border p-5 bg-white shadow-sm">
            <div className="flex justify-between">
              <div>
                <h2 className="font-semibold text-sm">Overview</h2>
                <p className="text-xs text-gray-500">
                  Publisher, GEO, carrier & final click URL.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-gray-400">
                  Remaining Weight
                </span>
                <div className={remaining === 0 ? "text-red-500" : "text-green-600"}>
                  {remaining}%
                </div>
              </div>
            </div>

            {meta ? (
              <>
                {/* META */}
                <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div><b>Publisher:</b> {meta.pub_code}</div>
                    <div><b>GEO:</b> {meta.geo}</div>
                    <div><b>Carrier:</b> {meta.carrier}</div>
                  </div>

                  {/* URL */}
                  <div>
                    <label className="text-xs font-semibold">Final URL</label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        className="flex-1 border rounded-md bg-gray-50 px-3 py-2 text-xs font-mono"
                        value={finalTrackingUrl}
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="border p-2 rounded-md"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* PARAM TOGGLES */}
                <div className="mt-4 border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold">Required Params</span>
                    {savingParams && (
                      <span className="text-[11px] flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving...
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {PARAM_ORDER.map((key) => {
                      const active = requiredParams[key];
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggleParam(key)}
                          className={
                            active
                              ? "border border-emerald-500 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs"
                              : "border border-gray-300 px-3 py-1 rounded-full text-xs text-gray-500"
                          }
                        >
                          {PARAM_LABELS[key]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PREVIEW */}
                <div className="mt-4 border-t pt-3">
                  <button
                    onClick={runPreview}
                    className="bg-black text-white px-3 py-2 rounded-md text-xs flex items-center gap-2"
                  >
                    {previewLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Running...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" /> Rotation Preview
                      </>
                    )}
                  </button>

                  <div className="text-xs mt-2 text-gray-600">
                    {preview ? (
                      preview.selected ? (
                        <>
                          <b>Selected Offer:</b> {preview.selected.offer_id}  
                        </>
                      ) : (
                        <>No eligible rule (Reason: {preview.reason})</>
                      )
                    ) : (
                      <>Run preview to simulate rotation.</>
                    )}
                  </div>
                </div>
              </>
            ) : selectedLink ? (
              <p className="text-xs text-gray-400 mt-3">Loading overview...</p>
            ) : (
              <p className="text-xs text-gray-400 mt-3">Select a tracking link.</p>
            )}
          </div>

          {/* RULES CARD */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex justify-between mb-3">
              <div>
                <h2 className="font-semibold text-sm">Rules</h2>
                <p className="text-xs text-gray-500">Offer rotation logic</p>
              </div>

              <button
                onClick={openAddRule}
                className="bg-emerald-600 text-white text-xs px-3 py-2 rounded-md"
              >
                <Plus className="h-4 w-4 inline mr-1" /> Add Rule
              </button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Offer</th>
                    <th className="px-3 py-2 text-left">Geo</th>
                    <th className="px-3 py-2 text-left">Carrier</th>
                    <th className="px-3 py-2 text-left">% Weight</th>
                    <th className="px-3 py-2 text-left">Fallback</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.offer_id}</td>
                      <td className="px-3 py-2">{r.geo}</td>
                      <td className="px-3 py-2">{r.carrier}</td>
                      <td className="px-3 py-2">{r.weight}%</td>
                      <td className="px-3 py-2">{r.is_fallback ? "YES" : "NO"}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className="text-blue-600 mr-2"
                          onClick={() => openEditRule(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600"
                          onClick={() => deleteRule(r)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!rules.length && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-3 py-3 text-center text-gray-400"
                      >
                        No rules added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-gray-500 mt-2">
              Total cannot exceed 100%
            </p>
          </div>
        </div>
      </div>

      {/* RULE MODAL */}
      {showRuleModal && (
        <RuleModal
          open={showRuleModal}
          onClose={() => {
            if (!savingRule) {
              setShowRuleModal(false);
              setEditingRule(null);
            }
          }}
          onSave={saveRule}
          rule={editingRule}
          remaining={remaining}
          offers={offers}
          loadingOffers={loadingOffers}
          saving={savingRule}
          meta={meta}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------
   RULE MODAL COMPONENT
-------------------------------------------------------- */

function RuleModal({
  open,
  onClose,
  onSave,
  rule,
  remaining,
  offers,
  loadingOffers,
  saving,
  meta,
}) {
  const [offerId, setOfferId] = useState(rule?.offer_id || "");
  const [geo, setGeo] = useState(rule?.geo || meta?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || meta?.carrier || "ALL");
  const [weight, setWeight] = useState(
    rule?.weight != null ? String(rule.weight) : ""
  );
  const [fallback, setFallback] = useState(!!rule?.is_fallback);
  const [status, setStatus] = useState(rule?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ offerId, geo, carrier, weight, fallback, status });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex justify-between border-b p-4">
          <h2 className="font-semibold text-sm">
            {rule ? "Edit Rule" : "Add Rule"}
          </h2>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* OFFER DROPDOWN */}
          <div>
            <label className="text-xs font-semibold">Offer *</label>
            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select Offer</option>

              {offers.map((o) => (
                <option key={o.offer_id} value={o.offer_id}>
                  {o.offer_id} — {o.name}
                </option>
              ))}
            </select>

            {loadingOffers && (
              <p className="text-[11px] text-gray-400">
                Loading active offers...
              </p>
            )}
          </div>

          {/* GEO + CARRIER */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">GEO</label>
              <input
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold">Carrier</label>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* WEIGHT */}
          <div>
            <label className="text-xs font-semibold">Weight (%)</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={`AutoFill (${remaining}% left)`}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          {/* FALLBACK & STATUS */}
          <div className="flex justify-between items-center border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fallback}
                onChange={(e) => setFallback(e.target.checked)}
              />
              Fallback rule
            </label>

            <div>
              <label className="text-xs">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="ml-2 border rounded-md px-2 py-1 text-sm"
              >
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="deleted">deleted</option>
              </select>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Save Rule"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
