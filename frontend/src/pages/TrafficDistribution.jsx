import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import {
  Search,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  Copy,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-toastify";

/* --------------------------------------
   Helpers
---------------------------------------*/

// Required params + token mapping for URL
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

const EMPTY_REQUIRED = {
  click_id: false,
  sub1: false,
  sub2: false,
  sub3: false,
  sub4: false,
  sub5: false,
  msisdn: false,
  ip: false,
  ua: false,
  device: false,
};

function buildTrackingUrlPreview(trackingUrl, requiredParams) {
  if (!trackingUrl) return "";
  const active = Object.entries(requiredParams || {})
    .filter(([, v]) => v)
    .map(([key]) => {
      const token = PARAM_LABELS[key] || key.toUpperCase();
      return `&${key}={${token}}`;
    })
    .join("");
  return trackingUrl + active;
}

/* --------------------------------------
   Rule Modal (same file)
---------------------------------------*/

function RuleModal({
  isOpen,
  onClose,
  onSaved,
  pubId,
  trackingLinkId,
  meta,
  offers,
  remaining,
  editingRule,
}) {
  const isEdit = !!editingRule;

  const [offerId, setOfferId] = useState(editingRule?.offer_id || "");
  const [geo, setGeo] = useState(
    editingRule?.geo || meta?.geo || "ALL"
  );
  const [carrier, setCarrier] = useState(
    editingRule?.carrier || meta?.carrier || "ALL"
  );
  const [weight, setWeight] = useState(
    editingRule?.weight != null ? String(editingRule.weight) : ""
  );
  const [fallback, setFallback] = useState(!!editingRule?.is_fallback);
  const [status, setStatus] = useState(editingRule?.status || "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setOfferId(editingRule?.offer_id || "");
      setGeo(editingRule?.geo || meta?.geo || "ALL");
      setCarrier(editingRule?.carrier || meta?.carrier || "ALL");
      setWeight(
        editingRule?.weight != null ? String(editingRule.weight) : ""
      );
      setFallback(!!editingRule?.is_fallback);
      setStatus(editingRule?.status || "active");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingRule, meta?.geo, meta?.carrier]);

  if (!isOpen) return null;

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
      offer_id: offerId, // numeric id, but dropdown label uses offer_id code
      geo: geo || "ALL",
      carrier: carrier || "ALL",
      is_fallback: fallback,
      weight: weight ? Number(weight) : null,
      autoFill: !weight,
      status,
    };

    try {
      if (isEdit) {
        await apiClient.put(
          `/distribution/rules/${editingRule.id}`,
          payload
        );
        toast.success("Rule updated");
      } else {
        await apiClient.post("/distribution/rules", payload);
        toast.success("Rule added");
      }
      await onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "Failed to save rule. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {isEdit ? "Edit Rule" : "Add Rule"}
            </h2>
            <p className="text-xs text-gray-500">
              Publisher: {pubId} • GEO: {meta?.geo || "ALL"} • Carrier:{" "}
              {meta?.carrier || "ALL"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Offer */}
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">
            Offer <span className="text-red-500">*</span>
          </label>
          <select
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select offer</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.offer_code} — {o.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Dropdown value backend se aane wale <b>offer_id</b> (जैसे
            OFF01 / OFF02) दिखाएगा, लेकिन backend को numeric <b>id</b>{" "}
            जाएगा।
          </p>
        </div>

        {/* GEO / Carrier */}
        <div className="mb-3 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">GEO</label>
            <input
              value={geo}
              onChange={(e) => setGeo(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Carrier
            </label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Weight */}
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">
            Weight (%)
          </label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`Leave empty for AutoFill (remaining ${remaining}%)`}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Blank छोड़ने पर system automatically इस link का remaining %
            fill करेगा।
          </p>
        </div>

        {/* Fallback + Status */}
        <div className="mb-4 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fallback}
              onChange={(e) => setFallback(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Mark as Fallback rule</span>
          </label>

          <div className="text-right">
            <label className="mb-1 block text-xs font-medium">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="deleted">deleted</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            disabled={saving}
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------
   Main Page
---------------------------------------*/

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLinkId, setSelectedLinkId] = useState(null);

  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);

  const [paramUpdating, setParamUpdating] = useState(false);

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links;
    const s = search.toLowerCase();
    return links.filter(
      (l) =>
        l.tracking_id.toLowerCase().includes(s) ||
        (l.publisher_name || "").toLowerCase().includes(s) ||
        (l.tracking_url || "").toLowerCase().includes(s)
    );
  }, [links, search]);

  const selectedLink = useMemo(
    () => links.find((l) => l.tracking_link_id === selectedLinkId) || null,
    [links, selectedLinkId]
  );

  const previewUrl = useMemo(
    () =>
      buildTrackingUrlPreview(
        meta?.tracking_url || selectedLink?.tracking_url,
        meta?.required_params || EMPTY_REQUIRED
      ),
    [meta, selectedLink]
  );

  /* --------------------- Load functions --------------------- */

  const loadTrackingLinks = async () => {
    if (!pubId.trim()) {
      toast.error("Please enter PUB ID (e.g. PUB03)");
      return;
    }

    setLoadingLinks(true);
    setSelectedLinkId(null);
    setMeta(null);
    setRules([]);
    setRemaining(0);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${encodeURIComponent(
          pubId.trim()
        )}`
      );
      if (!res.data?.success) {
        toast.error("Failed to load tracking links");
        return;
      }
      setLinks(res.data.links || []);
      if ((res.data.links || []).length) {
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
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${encodeURIComponent(
          pubId
        )}&tracking_link_id=${linkId}`
      );
      if (res.data?.success) {
        setMeta(res.data.meta);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load overview");
    }
  };

  const loadRules = async (linkId) => {
    if (!pubId || !linkId) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${encodeURIComponent(
          pubId
        )}&tracking_link_id=${linkId}`
      );
      if (res.data?.success) setRules(res.data.rules || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load rules");
    }
  };

  const loadRemaining = async (linkId) => {
    if (!pubId || !linkId) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${encodeURIComponent(
          pubId
        )}&tracking_link_id=${linkId}`
      );
      if (res.data?.success)
        setRemaining(Number(res.data.remaining || 0));
    } catch (e) {
      console.error(e);
    }
  };

  const loadOffers = async (geo, carrier) => {
    setOffersLoading(true);
    try {
      // Assumed API: /offers?status=active&geo=BD&carrier=Robi
      const params = new URLSearchParams();
      params.append("status", "active");
      if (geo) params.append("geo", geo);
      if (carrier) params.append("carrier", carrier);

      const res = await apiClient.get(`/offers?${params.toString()}`);

      const raw =
        res.data?.offers ||
        res.data?.data ||
        res.data?.rows ||
        res.data ||
        [];

      const list = (Array.isArray(raw) ? raw : []).map((o) => ({
        id: o.id,
        offer_code: o.offer_id || o.code || String(o.id),
        name: o.name || o.offer_name || "",
      }));

      setOffers(list);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load offers");
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  /* --------------------- Effects --------------------- */

  // When selected tracking link changes, load meta/rules/remaining
  useEffect(() => {
    if (!selectedLinkId) return;
    loadMeta(selectedLinkId);
    loadRules(selectedLinkId);
    loadRemaining(selectedLinkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLinkId]);

  // When meta (geo/carrier) ready, load offers
  useEffect(() => {
    if (!selectedLinkId || !meta) return;
    loadOffers(meta.geo, meta.carrier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLinkId, meta?.geo, meta?.carrier]);

  /* --------------------- Handlers --------------------- */

  const handleParamToggle = async (paramKey) => {
    if (!meta || !meta.tracking_link_id) return;
    const current = meta.required_params || EMPTY_REQUIRED;
    const updated = {
      ...EMPTY_REQUIRED,
      ...current,
      [paramKey]: !current[paramKey],
    };

    // Optimistic UI
    setMeta({ ...meta, required_params: updated });
    setParamUpdating(true);

    try {
      await apiClient.put(
        `/distribution/update-required-params/${meta.tracking_link_id}`,
        { required_params: updated }
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to update parameters");
      // Optionally re-load from backend
      loadMeta(selectedLinkId);
    } finally {
      setParamUpdating(false);
    }
  };

  const openAddRule = () => {
    setEditingRule(null);
    setRuleModalOpen(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setRuleModalOpen(true);
  };

  const refreshCurrent = async () => {
    if (!selectedLinkId) return;
    await Promise.all([
      loadMeta(selectedLinkId),
      loadRules(selectedLinkId),
      loadRemaining(selectedLinkId),
      meta ? loadOffers(meta.geo, meta.carrier) : Promise.resolve(),
    ]);
  };

  const handleDeleteRule = async (rule) => {
    if (
      !window.confirm(
        `Delete rule for offer ${rule.offer_id}? This cannot be undone.`
      )
    )
      return;

    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      toast.success("Rule deleted");
      loadRules(selectedLinkId);
      loadRemaining(selectedLinkId);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete rule");
    }
  };

  const handleCopyUrl = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      toast.success("Tracking URL copied");
    } catch {
      // Fallback
      window.prompt("Copy tracking URL:", previewUrl);
    }
  };

  const offerCodeMap = useMemo(() => {
    const map = {};
    for (const o of offers) map[o.id] = o.offer_code;
    return map;
  }, [offers]);

  /* --------------------- Render --------------------- */

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Traffic Distribution</h1>
          <p className="text-xs text-gray-500">
            Manage rotation rules, required parameters &amp; offer caps per
            publisher tracking link.
          </p>
        </div>
      </div>

      {/* Top: PUB ID + Load */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Publisher ID
            </label>
            <input
              value={pubId}
              onChange={(e) => setPubId(e.target.value.toUpperCase())}
              placeholder="PUB01, PUB02, PUB03..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadTrackingLinks}
            disabled={loadingLinks || !pubId.trim()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loadingLinks ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading
              </>
            ) : (
              "Load"
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        {/* Left: Tracking links list */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Search tracking links
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, URL or publisher name..."
                className="w-full rounded-lg border border-gray-300 px-9 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
            {filteredLinks.length === 0 && (
              <div className="py-10 text-center text-xs text-gray-400">
                No tracking links loaded. Enter PUB ID and click{" "}
                <b>Load</b>.
              </div>
            )}

            {filteredLinks.map((l) => {
              const active = l.tracking_link_id === selectedLinkId;
              return (
                <button
                  key={l.tracking_link_id}
                  onClick={() => setSelectedLinkId(l.tracking_link_id)}
                  className={`flex w-full flex-col items-start rounded-lg border px-3 py-2 text-left text-xs transition ${
                    active
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold">
                      {l.tracking_id}{" "}
                      {l.publisher_name && (
                        <span className="ml-1 text-[10px] text-gray-500">
                          • {l.publisher_name}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {l.type || "CPA"} • {Number(l.payout || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-1 w-full text-[11px] text-gray-500">
                    {l.tracking_url}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Overview + Rules */}
        <div className="space-y-4">
          {/* Overview */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Overview</h2>
                {meta && (
                  <p className="text-xs text-gray-500">
                    Publisher: <b>{meta.pub_code}</b> • GEO:{" "}
                    <b>{meta.geo}</b> • Carrier: <b>{meta.carrier}</b>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={refreshCurrent}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
                <div className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-600">
                  Remaining Weight:{" "}
                  <span
                    className={
                      remaining === 0 ? "font-semibold text-red-500" : ""
                    }
                  >
                    {remaining}%
                  </span>
                </div>
              </div>
            </div>

            {/* URL + copy */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Tracking URL (with required params)
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={previewUrl || ""}
                  className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700"
                />
                <button
                  onClick={handleCopyUrl}
                  disabled={!previewUrl}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Example:{" "}
                <code className="rounded bg-gray-100 px-1">
                  &click_id={{"{CLICK_ID}"}}&ip={{"{IP}"}}&ua={{"{UA}"}}</code>
              </p>
            </div>

            {/* Required params */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  Required Parameters
                </span>
                {paramUpdating && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </span>
                )}
              </div>
              <p className="mb-2 text-[11px] text-gray-400">
                Click to toggle which parameters are required and injected
                into the final click URL.
              </p>

              <div className="flex flex-wrap gap-2">
                {Object.keys(PARAM_LABELS).map((key) => {
                  const active = meta?.required_params?.[key];
                  return (
                    <button
                      key={key}
                      onClick={() => handleParamToggle(key)}
                      className={`rounded-full border px-3 py-1 text-[11px] transition ${
                        active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/60"
                      }`}
                    >
                      {PARAM_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Rules</h2>
                <p className="text-[11px] text-gray-500">
                  Define offer rotation, GEO/carrier targeting and fallback
                  logic.
                </p>
              </div>
              <button
                onClick={openAddRule}
                disabled={!selectedLinkId}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Plus className="h-3 w-3" />
                Add Rule
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Offer</th>
                    <th className="px-3 py-2">GEO</th>
                    <th className="px-3 py-2">Carrier</th>
                    <th className="px-3 py-2">Weight</th>
                    <th className="px-3 py-2">Fallback</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-[11px] text-gray-400"
                      >
                        No rules configured yet.
                      </td>
                    </tr>
                  )}

                  {rules.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-gray-100 text-[11px]"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-800">
                            {offerCodeMap[r.offer_id] || r.offer_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{r.geo}</td>
                      <td className="px-3 py-2">{r.carrier}</td>
                      <td className="px-3 py-2">{r.weight}%</td>
                      <td className="px-3 py-2">
                        {r.is_fallback ? (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
                            YES
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-50 px-2 py-1 text-[10px] text-gray-500">
                            NO
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] ${
                            r.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditRule(r)}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-[10px] text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRule(r)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
              <div className="inline-flex items-center gap-1">
                <ChevronDown className="h-3 w-3" />
                Rotation uses weighted random selection with cap +
                fallback logic from backend.
              </div>
              {offersLoading && (
                <div className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading offers…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rule Modal */}
      <RuleModal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        onSaved={async () => {
          await loadRules(selectedLinkId);
          await loadRemaining(selectedLinkId);
        }}
        pubId={pubId}
        trackingLinkId={selectedLinkId}
        meta={meta}
        offers={offers}
        remaining={remaining}
        editingRule={editingRule}
      />
    </div>
  );
}
