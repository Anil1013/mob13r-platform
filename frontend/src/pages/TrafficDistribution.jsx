// frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";

/* ------------------------------------------------------------------
   CONSTANTS
------------------------------------------------------------------ */

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

const PARAM_TOKEN_MAP = {
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

const mergeWithDefaults = (backendParams) => {
  const p = backendParams && typeof backendParams === "object" ? backendParams : {};
  const merged = { ...DEFAULT_REQUIRED_PARAMS, ...p };
  // ensure all keys boolean
  Object.keys(DEFAULT_REQUIRED_PARAMS).forEach((k) => {
    merged[k] = !!merged[k];
  });
  return merged;
};

/* ------------------------------------------------------------------
   RULE MODAL (INLINE COMPONENT)
------------------------------------------------------------------ */

function RuleModal({
  open,
  onClose,
  onSaved,
  pubId,
  trackingLinkId,
  offers,
  remaining,
  rule,
}) {
  const [offerId, setOfferId] = useState(rule ? String(rule.offer_id) : "");
  const [geo, setGeo] = useState(rule?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || "ALL");
  const [weight, setWeight] = useState(
    rule && rule.weight !== null && rule.weight !== undefined
      ? String(rule.weight)
      : ""
  );
  const [fallback, setFallback] = useState(!!rule?.is_fallback);
  const [status, setStatus] = useState(rule?.status || "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (rule) {
      setOfferId(String(rule.offer_id));
      setGeo(rule.geo || "ALL");
      setCarrier(rule.carrier || "ALL");
      setWeight(
        rule.weight !== null && rule.weight !== undefined
          ? String(rule.weight)
          : ""
      );
      setFallback(!!rule.is_fallback);
      setStatus(rule.status || "active");
    } else {
      setOfferId("");
      setGeo("ALL");
      setCarrier("ALL");
      setWeight("");
      setFallback(false);
      setStatus("active");
    }
    setError("");
  }, [rule, open]);

  if (!open) return null;

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
      // backend expects numeric offers.id
      offer_id: Number(offerId),
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
        await apiClient.post(`/distribution/rules`, payload);
        toast.success("Rule added");
      }
      await onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to save rule"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {rule ? "Edit Rule" : "Add Rule"}
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-gray-500 hover:text-black"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Offer */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">
            Offer <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          >
            <option value="">Select offer</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {/* show offer_id like OFF01 */}
                {o.offer_id || o.id} — {o.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Dropdown value backend se aane wale <b>offer_id</b> jaise OFF01 /
            OFF02 dikhayega.
          </p>
        </div>

        {/* GEO / Carrier */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">GEO</label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={geo}
              onChange={(e) => setGeo(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Carrier</label>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
        </div>

        {/* Weight */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">
            Weight (%)
          </label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`Leave empty for AutoFill (remaining ${remaining}%)`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Blank chhodne par system automatically remaining % fill karega.
          </p>
        </div>

        {/* Fallback + Status */}
        <div className="mb-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fallback}
              onChange={(e) => setFallback(e.target.checked)}
            />
            <span>Mark as Fallback Rule</span>
          </label>

          <div className="text-right">
            <label className="mb-1 block text-xs font-semibold">Status</label>
            <select
              className="rounded border px-2 py-1 text-xs"
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
            className="rounded border px-4 py-2 text-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   MAIN PAGE
------------------------------------------------------------------ */

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [requiredParams, setRequiredParams] = useState(
    mergeWithDefaults(null)
  );

  const [rules, setRules] = useState([]);
  const [remainingWeight, setRemainingWeight] = useState(100);

  const [offers, setOffers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  /* -----------------------------
     LOAD TRACKING LINKS
  ------------------------------ */

  const loadLinks = async () => {
    if (!pubId.trim()) {
      toast.error("Please enter Publisher ID (e.g. PUB03)");
      return;
    }

    setLoadingLinks(true);
    setSelectedLinkId(null);
    setSelectedLink(null);
    setRules([]);
    setRemainingWeight(100);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${pubId.trim()}`
      );

      if (!res.data.success) {
        toast.error("Failed to load tracking links");
        return;
      }

      const fetched = res.data.links || [];
      setLinks(fetched);

      if (fetched.length === 0) {
        toast.info("No tracking links found for this publisher");
        return;
      }

      // auto select first
      const first = fetched[0];
      setSelectedLinkId(first.tracking_link_id);
      setSelectedLink(first);
      setRequiredParams(mergeWithDefaults(first.required_params));
    } catch (err) {
      console.error(err);
      toast.error("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  /* -----------------------------
     WHEN SELECTED LINK CHANGES
  ------------------------------ */

  useEffect(() => {
    if (!selectedLinkId) return;
    const link = links.find((l) => l.tracking_link_id === selectedLinkId);
    if (!link) return;

    setSelectedLink(link);
    setRequiredParams(mergeWithDefaults(link.required_params));
  }, [selectedLinkId, links]);

  // Load rules + remaining + offers when selectedLink changes
  useEffect(() => {
    if (!selectedLink || !pubId) return;
    const { tracking_link_id } = selectedLink;

    const loadRulesAndRemaining = async () => {
      try {
        const [rulesRes, remainingRes] = await Promise.all([
          apiClient.get(
            `/distribution/rules?pub_id=${pubId}&tracking_link_id=${tracking_link_id}`
          ),
          apiClient.get(
            `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${tracking_link_id}`
          ),
        ]);

        if (rulesRes.data.success) setRules(rulesRes.data.rules || []);
        if (remainingRes.data.success)
          setRemainingWeight(remainingRes.data.remaining ?? 0);
      } catch (err) {
        console.error(err);
        toast.error("Error loading rules");
      }
    };

    const loadOffers = async () => {
      try {
        const res = await apiClient.get(
          `/distribution/offers?geo=${selectedLink.geo}&carrier=${selectedLink.carrier}&pub_id=${pubId}`
        );
        if (res.data.success) {
          setOffers(res.data.offers || []);
        }
      } catch (err) {
        console.error(err);
        // optional: no toast; not critical
      }
    };

    loadRulesAndRemaining();
    loadOffers();
  }, [selectedLink, pubId]);

  /* -----------------------------
     FILTERED LINKS LIST
  ------------------------------ */

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links;
    const s = search.toLowerCase();
    return links.filter(
      (l) =>
        String(l.tracking_id).toLowerCase().includes(s) ||
        (l.tracking_url || "").toLowerCase().includes(s) ||
        (l.publisher_name || "").toLowerCase().includes(s)
    );
  }, [links, search]);

  /* -----------------------------
     PARAM TOGGLE + SAVE TO BACKEND
  ------------------------------ */

  const handleToggleParam = async (key) => {
    if (!selectedLink) return;

    const updated = {
      ...requiredParams,
      [key]: !requiredParams[key],
    };
    setRequiredParams(updated);

    try {
      await apiClient.put(
        `/distribution/update-required-params/${selectedLink.tracking_link_id}`,
        { required_params: updated }
      );
      toast.success("Parameters updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update parameters");
    }
  };

  /* -----------------------------
     FINAL URL BUILDER + COPY
  ------------------------------ */

  const finalUrl = useMemo(() => {
    if (!selectedLink) return "";
    const baseUrl = selectedLink.tracking_url || "";
    const params = [];

    Object.entries(requiredParams).forEach(([key, isRequired]) => {
      if (isRequired) {
        const token = PARAM_TOKEN_MAP[key];
        if (token) {
          // EXACT required pattern: &click_id={CLICK_ID}&ip={IP}&ua={UA}
          params.push(`${key}={${token}}`);
        }
      }
    });

    if (params.length === 0) return baseUrl;
    return baseUrl + "&" + params.join("&");
  }, [selectedLink, requiredParams]);

  const handleCopyUrl = async () => {
    if (!finalUrl) return;
    try {
      await navigator.clipboard.writeText(finalUrl);
      toast.success("Tracking URL copied");
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy URL");
    }
  };

  /* -----------------------------
     RULES helpers
  ------------------------------ */

  const refreshRules = async () => {
    if (!selectedLink || !pubId) return;
    try {
      const [rulesRes, remainingRes] = await Promise.all([
        apiClient.get(
          `/distribution/rules?pub_id=${pubId}&tracking_link_id=${selectedLink.tracking_link_id}`
        ),
        apiClient.get(
          `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${selectedLink.tracking_link_id}`
        ),
      ]);

      if (rulesRes.data.success) setRules(rulesRes.data.rules || []);
      if (remainingRes.data.success)
        setRemainingWeight(remainingRes.data.remaining ?? 0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh rules");
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      toast.success("Rule deleted");
      refreshRules();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete rule");
    }
  };

  const offerLabelForRule = (rule) => {
    const o = offers.find((of) => Number(of.id) === Number(rule.offer_id));
    if (o) return o.offer_id || o.name || o.id;
    return rule.offer_id;
  };

  /* ------------------------------------------------------------------
     RENDER
  ------------------------------------------------------------------ */

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Traffic Distribution</h1>
          <p className="text-sm text-gray-500">
            Manage rotation rules, required tracking parameters & offer caps per
            publisher tracking link.
          </p>
        </div>
      </div>

      {/* Top controls: PUB input */}
      <div className="mb-4 flex items-center gap-3">
        <div className="w-full max-w-xs">
          <label className="mb-1 block text-sm font-medium">Publisher ID</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="e.g. PUB03"
            value={pubId}
            onChange={(e) => setPubId(e.target.value.toUpperCase())}
          />
        </div>
        <button
          onClick={loadLinks}
          disabled={loadingLinks}
          className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loadingLinks ? "Loading..." : "Load"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT: tracking links list */}
        <div className="lg:col-span-4">
          <label className="mb-1 block text-sm font-medium">
            Search tracking links
          </label>
          <input
            className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Search by ID, URL or publisher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="space-y-2">
            {filteredLinks.map((link) => (
              <button
                key={link.tracking_link_id}
                onClick={() => setSelectedLinkId(link.tracking_link_id)}
                className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                  selectedLinkId === link.tracking_link_id
                    ? "border-blue-500 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{link.tracking_id}</span>
                  <span className="text-xs text-gray-500">
                    {link.type} • {link.payout}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-gray-500">
                  {link.tracking_url}
                </div>
              </button>
            ))}

            {filteredLinks.length === 0 && pubId && !loadingLinks && (
              <p className="text-xs text-gray-400">
                No tracking links for this publisher.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT: overview + rules */}
        <div className="space-y-6 lg:col-span-8">
          {/* Overview */}
          {selectedLink && (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Overview</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Publisher: <b>{selectedLink.pub_code}</b> • GEO:{" "}
                    <b>{selectedLink.geo}</b> • Carrier:{" "}
                    <b>{selectedLink.carrier}</b>
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div className="font-semibold text-gray-700">
                    Remaining Weight
                  </div>
                  <div
                    className={
                      remainingWeight === 0
                        ? "font-bold text-red-500"
                        : "font-bold text-emerald-600"
                    }
                  >
                    {remainingWeight}%
                  </div>
                </div>
              </div>

              {/* URL + copy */}
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Tracking URL (with required parameters)
                </label>
                <div className="flex gap-2">
                  <input
                    className="w-full flex-1 rounded-lg border px-3 py-2 text-xs font-mono"
                    value={finalUrl}
                    readOnly
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Required params chips */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">
                    Required Parameters
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Click to toggle which params will be appended.
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PARAM_ORDER.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleParam(key)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        requiredParams[key]
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {PARAM_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rules */}
          {selectedLink && (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Rules</h2>
                  <p className="text-xs text-gray-500">
                    Define offer rotation, GEO/carrier targeting and fallback
                    logic.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingRule(null);
                    setModalOpen(true);
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  + Add Rule
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b bg-gray-50 text-[11px] uppercase text-gray-500">
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
                    {rules.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono">
                          {offerLabelForRule(r)}
                        </td>
                        <td className="px-3 py-2">{r.geo}</td>
                        <td className="px-3 py-2">{r.carrier}</td>
                        <td className="px-3 py-2">{r.weight}%</td>
                        <td className="px-3 py-2">
                          {r.is_fallback ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              YES
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                              NO
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] ${
                              r.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="mr-2 text-xs font-medium text-blue-600 hover:underline"
                            onClick={() => {
                              setEditingRule(r);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs font-medium text-red-600 hover:underline"
                            onClick={() => handleDeleteRule(r.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    {rules.length === 0 && (
                      <tr>
                        <td
                          className="px-3 py-4 text-center text-xs text-gray-400"
                          colSpan={7}
                        >
                          No rules configured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <RuleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refreshRules}
        pubId={pubId}
        trackingLinkId={selectedLink?.tracking_link_id}
        offers={offers}
        remaining={remainingWeight}
        rule={editingRule}
      />
    </div>
  );
}
