// frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";
import {
  Link as LinkIcon,
  RefreshCcw,
  Search,
  Copy as CopyIcon,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Wifi,
} from "lucide-react";

/** -----------------------------------------------------------
 *  DEFAULT REQUIRED PARAMS (frontend mirror only for UI)
 *  ----------------------------------------------------------*/
const DEFAULT_REQUIRED_PARAMS = {
  click_id: false,
  sub1: false,
  sub2: false,
  sub3: false,
  sub4: false,
  sub5: false,
  msisdn: false,
  ip: true,
  ua: true,
  device: false,
};

/** -----------------------------------------------------------
 *  Rule Modal (same file as requested)
 *  ----------------------------------------------------------*/
function RuleModal({
  isOpen,
  onClose,
  rule,
  pubId,
  trackingLinkId,
  offers,
  remaining,
  onSaved,
}) {
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

  useEffect(() => {
    if (!isOpen) return;
    setOfferId(rule?.offer_id || "");
    setGeo(rule?.geo || "ALL");
    setCarrier(rule?.carrier || "ALL");
    setWeight(
      rule?.weight !== undefined && rule?.weight !== null
        ? String(rule.weight)
        : ""
    );
    setFallback(!!rule?.is_fallback);
    setStatus(rule?.status || "active");
    setError("");
    setSaving(false);
  }, [isOpen, rule]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!offerId) {
      setError("Offer ID required");
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
      if (rule?.id) {
        const res = await apiClient.put(
          `/distribution/rules/${rule.id}`,
          payload
        );
        if (!res.data.success) throw new Error(res.data.error || "Update failed");
      } else {
        const res = await apiClient.post(`/distribution/rules`, payload);
        if (!res.data.success) throw new Error(res.data.error || "Create failed");
      }
      toast.success("Rule saved");
      await onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {rule ? "Edit Distribution Rule" : "Add Distribution Rule"}
          </h2>
          <button
            className="text-xl leading-none text-gray-500 hover:text-gray-900"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Offer dropdown */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            Offer ID <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          >
            <option value="">Select Offer (OFF01, OFF02...)</option>
            {offers.map((o) => {
              const id = o.offer_id || o.id; // backend id (like OFF01)
              const name = o.name || o.offer_name || "";
              return (
                <option key={id} value={id}>
                  {id} {name ? `— ${name}` : ""}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Active offers for this publisher/geo/carrier (if backend filters).
          </p>
        </div>

        {/* GEO + Carrier */}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              GEO
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={geo}
              onChange={(e) => setGeo(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Carrier
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
        </div>

        {/* Weight */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            Weight (%)
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`Leave blank for AutoFill (Remaining ${remaining}%)`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Empty = Smart AutoFill (system uses remaining %).
          </p>
        </div>

        {/* Fallback + Status */}
        <div className="mb-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={fallback}
              onChange={(e) => setFallback(e.target.checked)}
            />
            <span>Fallback rule</span>
          </label>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Status
            </label>
            <select
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
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
        <div className="flex justify-end gap-3">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCcw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Rule"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** -----------------------------------------------------------
 *  MAIN PAGE
 *  ----------------------------------------------------------*/
export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);

  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(100);

  const [requiredParams, setRequiredParams] = useState(DEFAULT_REQUIRED_PARAMS);
  const [finalUrl, setFinalUrl] = useState("");
  const [updatingParams, setUpdatingParams] = useState(false);

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  const [geoFilter, setGeoFilter] = useState("ALL");
  const [carrierFilter, setCarrierFilter] = useState("ALL");

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  /** -------------------------------
   * FILTERED LINKS
   * ------------------------------*/
  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links;
    return links.filter((l) => {
      const term = search.toLowerCase();
      return (
        l.tracking_id?.toLowerCase().includes(term) ||
        l.tracking_url?.toLowerCase().includes(term) ||
        l.publisher_name?.toLowerCase().includes(term) ||
        l.name?.toLowerCase().includes(term)
      );
    });
  }, [links, search]);

  /** -------------------------------
   * BUILD FINAL URL (no %3 issue)
   * ------------------------------*/
  const computeFinalUrl = (baseUrl, params) => {
    if (!baseUrl) return "";
    const enabled = Object.entries(params || {}).filter(([_, v]) => v);
    if (!enabled.length) return baseUrl;

    const hasQuery = baseUrl.includes("?");
    let url = baseUrl + (hasQuery ? "&" : "?");

    url += enabled
      .map(([key]) => `${key}={${key.toUpperCase()}}`)
      .join("&");

    return url;
  };

  useEffect(() => {
    if (!meta) {
      setFinalUrl("");
      return;
    }
    setFinalUrl(computeFinalUrl(meta.tracking_url, requiredParams));
  }, [meta, requiredParams]);

  /** -------------------------------
   * LOAD TRACKING LINKS
   * ------------------------------*/
  const loadTrackingLinks = async () => {
    if (!pubId.trim()) {
      toast.error("Please enter PUB code (PUB01 / PUB02 / PUB03)");
      return;
    }
    setLoadingLinks(true);
    setSelectedLinkId(null);
    setSelectedLink(null);
    setMeta(null);
    setRules([]);
    setOffers([]);
    setPreview(null);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${pubId.trim()}`
      );
      if (!res.data.success) {
        throw new Error(res.data.error || "Failed");
      }
      setLinks(res.data.links || []);
      if (!res.data.links || !res.data.links.length) {
        toast.info("No tracking links found for this publisher");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  /** -------------------------------
   * WHEN LINK SELECTED
   * ------------------------------*/
  const handleSelectLink = (link) => {
    setSelectedLinkId(link.tracking_link_id);
    setSelectedLink(link);
    setMeta(null);
    setRules([]);
    setRemaining(100);
    setOffers([]);
    setPreview(null);

    const rp = link.required_params || DEFAULT_REQUIRED_PARAMS;
    setRequiredParams({ ...DEFAULT_REQUIRED_PARAMS, ...rp });

    setGeoFilter(link.geo || "ALL");
    setCarrierFilter(link.carrier || "ALL");
  };

  /** -------------------------------
   * LOAD META + RULES + REMAINING
   * ------------------------------*/
  const loadMeta = async () => {
    if (!selectedLinkId || !pubId) return;
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${pubId}&tracking_link_id=${selectedLinkId}`
      );
      if (res.data.success) {
        setMeta(res.data.meta);
        if (res.data.meta?.required_params) {
          setRequiredParams({
            ...DEFAULT_REQUIRED_PARAMS,
            ...res.data.meta.required_params,
          });
        }
        if (res.data.meta?.geo) setGeoFilter(res.data.meta.geo);
        if (res.data.meta?.carrier) setCarrierFilter(res.data.meta.carrier);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load meta");
    }
  };

  const loadRules = async () => {
    if (!selectedLinkId || !pubId) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId}&tracking_link_id=${selectedLinkId}`
      );
      if (res.data.success) {
        setRules(res.data.rules || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rules");
    }
  };

  const loadRemaining = async () => {
    if (!selectedLinkId || !pubId) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${selectedLinkId}`
      );
      if (res.data.success) {
        setRemaining(res.data.remaining);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /** -------------------------------
   * LOAD OFFERS (generic endpoint)
   * NOTE: If your backend uses another path,
   *       just change the URL below.
   * ------------------------------*/
  const loadOffers = async () => {
    if (!pubId) return;
    setOffersLoading(true);
    try {
      // 🔁 CHANGE HERE if your offers endpoint is different
      const res = await apiClient.get("/offers", {
        params: {
          pub_id: pubId,
          geo: geoFilter === "ALL" ? undefined : geoFilter,
          carrier: carrierFilter === "ALL" ? undefined : carrierFilter,
          status: "active",
        },
      });

      const data = res.data || {};
      const list = data.offers || data.items || data.data || [];
      setOffers(list);
    } catch (err) {
      console.error("offers load error", err);
      setOffers([]);
      // no toast, to avoid spam if endpoint slightly different
    } finally {
      setOffersLoading(false);
    }
  };

  /** -------------------------------
   * LOAD ALL WHEN LINK CHANGES
   * ------------------------------*/
  useEffect(() => {
    if (!selectedLinkId || !pubId) return;
    loadMeta();
    loadRules();
    loadRemaining();
  }, [selectedLinkId, pubId]);

  /** When geo/carrier filter changes, reload offers */
  useEffect(() => {
    if (!selectedLinkId) return;
    loadOffers();
  }, [geoFilter, carrierFilter, pubId, selectedLinkId]);

  /** -------------------------------
   * PARAM TOGGLE (update backend)
   * ------------------------------*/
  const handleParamToggle = async (key) => {
    if (!selectedLinkId) return;

    const updated = {
      ...DEFAULT_REQUIRED_PARAMS,
      ...(requiredParams || {}),
      [key]: !requiredParams?.[key],
    };

    setRequiredParams(updated);
    setUpdatingParams(true);
    try {
      const res = await apiClient.put(
        `/distribution/update-required-params/${selectedLinkId}`,
        { required_params: updated }
      );
      if (!res.data.success) {
        throw new Error(res.data.error || "Update failed");
      }
      // meta required_params also refresh
      setMeta((prev) =>
        prev ? { ...prev, required_params: updated } : prev
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update parameters");
    } finally {
      setUpdatingParams(false);
    }
  };

  /** -------------------------------
   * RULE ACTIONS
   * ------------------------------*/
  const openAddRule = () => {
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      const res = await apiClient.delete(`/distribution/rules/${id}`);
      if (!res.data.success) throw new Error(res.data.error || "Failed");
      toast.success("Rule deleted");
      loadRules();
      loadRemaining();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete rule");
    }
  };

  const refreshRules = async () => {
    await Promise.all([loadRules(), loadRemaining()]);
  };

  /** -------------------------------
   * ROTATION PREVIEW
   * ------------------------------*/
  const handlePreviewRotation = async () => {
    if (!selectedLinkId || !pubId) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await apiClient.get("/distribution/rotation/preview", {
        params: {
          pub_id: pubId,
          tracking_link_id: selectedLinkId,
          geo: geoFilter,
          carrier: carrierFilter,
        },
      });
      if (!res.data.success) {
        throw new Error(res.data.error || "Preview failed");
      }
      setPreview(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rotation preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  /** -------------------------------
   * COPY URL
   * ------------------------------*/
  const handleCopyUrl = async () => {
    if (!finalUrl) return;
    try {
      await navigator.clipboard.writeText(finalUrl);
      toast.success("Tracking URL copied");
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  /** -------------------------------
   * RENDER
   * ------------------------------*/
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-slate-200 bg-white/80 p-4 lg:block">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Wifi className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              mob13r
            </div>
            <div className="text-sm font-semibold text-slate-900">
              Traffic Engine
            </div>
          </div>
        </div>

        <nav className="space-y-1 text-sm">
          <div className="rounded-xl bg-blue-50 px-3 py-2 text-blue-700">
            Traffic Distribution
          </div>
          <div className="rounded-xl px-3 py-2 text-slate-500">
            Fraud Analytics
          </div>
          <div className="rounded-xl px-3 py-2 text-slate-500">
            Reports
          </div>
        </nav>

        <div className="mt-8 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
          <div className="mb-1 font-semibold text-slate-700">
            Tips for best setup
          </div>
          <ul className="space-y-1">
            <li>• Set at least one fallback rule</li>
            <li>• Use AutoFill for last rule</li>
            <li>• Monitor caps daily</li>
          </ul>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-6 py-3 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Traffic Distribution
            </h1>
            <p className="text-xs text-slate-500">
              Configure rotation, caps & tracking parameters publisher-wise.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Settings className="h-4 w-4" />
            <span>Advanced rules engine</span>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
          {/* Left: Tracking links list */}
          <div className="flex w-full flex-col gap-3 lg:w-1/3">
            {/* PUB input + search */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Publisher Code
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="PUB01, PUB02, PUB03..."
                    value={pubId}
                    onChange={(e) => setPubId(e.target.value.toUpperCase())}
                  />
                </div>
                <button
                  className="mt-5 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  onClick={loadTrackingLinks}
                  disabled={loadingLinks}
                >
                  {loadingLinks ? (
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Load
                </button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-3 py-2 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
                  placeholder="Search links by ID, URL, name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Tracking links */}
            <div className="flex-1 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tracking Links
                </span>
                <span className="text-xs text-slate-400">
                  {filteredLinks.length} found
                </span>
              </div>

              <div className="max-h-[480px] space-y-1 overflow-auto px-2 py-2">
                {filteredLinks.map((l) => {
                  const active = l.tracking_link_id === selectedLinkId;
                  return (
                    <button
                      key={l.tracking_link_id}
                      className={`flex w-full flex-col rounded-xl border px-3 py-2 text-left text-xs transition ${
                        active
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                      }`}
                      onClick={() => handleSelectLink(l)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {l.tracking_id}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            l.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {l.status || "unknown"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5">
                          {l.geo}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5">
                          {l.carrier}
                        </span>
                        <span className="truncate text-slate-400">
                          {l.tracking_url}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {!filteredLinks.length && (
                  <div className="py-10 text-center text-xs text-slate-400">
                    No links. Enter PUB code and click Load.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Overview + Rules + Params */}
          <div className="flex w-full flex-1 flex-col gap-3">
            {/* Overview + Params + URL */}
            <div className="grid gap-3 lg:grid-cols-2">
              {/* Overview */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Distribution Overview
                    </div>
                    <div className="text-sm text-slate-800">
                      {selectedLink
                        ? selectedLink.publisher_name || selectedLink.pub_code
                        : "Select a tracking link"}
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
                    onClick={refreshRules}
                    disabled={!selectedLinkId}
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Refresh
                  </button>
                </div>

                {meta ? (
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Publisher</span>
                      <span className="font-medium">
                        {meta.pub_code}{" "}
                        {selectedLink?.publisher_name
                          ? `— ${selectedLink.publisher_name}`
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">GEO</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
                        {meta.geo}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Carrier</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
                        {meta.carrier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">% Used</span>
                      <span className="font-semibold text-slate-800">
                        {100 - remaining}% used · {remaining}% free
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 text-xs text-slate-400">
                    Select a tracking link to view details.
                  </div>
                )}

                {/* Geo/Carrier filter for preview + offers */}
                {selectedLinkId && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Geo (for preview/offers)
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                        value={geoFilter}
                        onChange={(e) =>
                          setGeoFilter(
                            e.target.value ? e.target.value.toUpperCase() : "ALL"
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Carrier (for preview/offers)
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                        value={carrierFilter}
                        onChange={(e) =>
                          setCarrierFilter(e.target.value || "ALL")
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Rotation preview */}
                {selectedLinkId && (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Rotation Preview
                      </span>
                      <button
                        className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-black disabled:opacity-60"
                        onClick={handlePreviewRotation}
                        disabled={previewLoading}
                      >
                        {previewLoading ? (
                          <RefreshCcw className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-3 w-3" />
                        )}
                        Run
                      </button>
                    </div>
                    {preview && (
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <div>
                          <span className="text-slate-500">Type:</span>{" "}
                          <span className="font-medium">
                            {preview.type || preview.reason}
                          </span>
                        </div>
                        {preview.selected && (
                          <>
                            <div>
                              <span className="text-slate-500">Offer ID:</span>{" "}
                              <span className="font-semibold">
                                {preview.selected.offer_id}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">
                                Rule Weight:
                              </span>{" "}
                              <span>{preview.selected.weight}%</span>
                            </div>
                          </>
                        )}
                        {!preview.selected && (
                          <div className="text-slate-400">
                            No eligible rule found for this geo/carrier.
                          </div>
                        )}
                      </div>
                    )}
                    {!preview && !previewLoading && (
                      <div className="text-[11px] text-slate-400">
                        Use current rules + caps to simulate selected offer.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Params + URL */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tracking Parameters
                  </span>
                  {selectedLinkId && (
                    <span className="text-[10px] text-slate-400">
                      Auto-synced with backend
                    </span>
                  )}
                </div>

                {selectedLinkId ? (
                  <>
                    {/* Params toggle */}
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                      {Object.keys(DEFAULT_REQUIRED_PARAMS).map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={!!requiredParams?.[key]}
                            onChange={() => handleParamToggle(key)}
                            disabled={updatingParams}
                          />
                          <span className="uppercase">
                            {key.replace("_", " ")}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Final URL */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          Final Tracking URL
                        </span>
                        <button
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] hover:bg-white"
                          onClick={handleCopyUrl}
                          disabled={!finalUrl}
                        >
                          <CopyIcon className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                      <div className="max-h-20 overflow-auto rounded bg-white px-2 py-1 text-[11px] text-slate-800">
                        {finalUrl || "Select at least one parameter."}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Example:{" "}
                        <code className="rounded bg-gray-100 px-1">
                          &click_id={'{CLICK_ID}'}&ip={'{IP}'}&ua={'{UA}'}
                        </code>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="pt-4 text-xs text-slate-400">
                    Select a tracking link to configure parameters.
                  </div>
                )}
              </div>
            </div>

            {/* Rules table */}
            <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Distribution Rules
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Weighted rotation + fallback per offer.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    Remaining:{" "}
                    <span className="font-semibold text-slate-900">
                      {remaining}%
                    </span>
                  </span>
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    onClick={openAddRule}
                    disabled={!selectedLinkId}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Rule
                  </button>
                </div>
              </div>

              {selectedLinkId ? (
                <div className="mt-2 overflow-auto rounded-xl border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Offer ID</th>
                        <th className="px-3 py-2 text-left">Geo</th>
                        <th className="px-3 py-2 text-left">Carrier</th>
                        <th className="px-3 py-2 text-right">% Weight</th>
                        <th className="px-3 py-2 text-center">Fallback</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t border-slate-100 hover:bg-slate-50/70"
                        >
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {r.offer_id}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {r.geo || "ALL"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {r.carrier || "ALL"}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            {r.weight}%
                          </td>
                          <td className="px-3 py-2 text-center">
                            {r.is_fallback ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                YES
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] ${
                                r.status === "active"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : r.status === "paused"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-white"
                                onClick={() => openEditRule(r)}
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 hover:bg-red-100"
                                onClick={() => handleDeleteRule(r.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Del
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!rules.length && (
                        <tr>
                          <td
                            className="px-3 py-6 text-center text-[11px] text-slate-400"
                            colSpan={7}
                          >
                            No rules yet. Add first rule for this tracking link.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="pt-6 text-center text-xs text-slate-400">
                  Select a tracking link to manage rules.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rule modal */}
        <RuleModal
          isOpen={showRuleModal}
          onClose={() => setShowRuleModal(false)}
          rule={editingRule}
          pubId={pubId}
          trackingLinkId={selectedLinkId}
          offers={offers}
          remaining={remaining}
          onSaved={refreshRules}
        />
      </div>
    </div>
  );
}
