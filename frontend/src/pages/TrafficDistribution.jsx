/*  ------------------------------------------------------------------
    TrafficDistribution.jsx  — FULL FIXED + PREMIUM UI
    Compatible with backend distribution.js (offer_id = INT)
------------------------------------------------------------------ */

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
      const placeholder = PARAM_PLACEHOLDERS[key] || `{${key.toUpperCase()}}`;
      return `${encodeURIComponent(key)}=${placeholder}`;
    });

  if (!activeParams.length) return baseUrl;

  const joiner = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${joiner}${activeParams.join("&")}`;
}

/* --------------------------------------------------------
   MAIN COMPONENT
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
     FILTERED LINKS
  -------------------------------------------------------- */

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links;
    const q = search.toLowerCase();
    return links.filter(
      (l) =>
        l.tracking_id.toLowerCase().includes(q) ||
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
    setLoadingLinks(true);
    setSelectedLink(null);
    setMeta(null);
    setRules([]);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${encodeURIComponent(pubId.trim())}`
      );

      if (!res.data?.success) {
        toast.error(res.data?.error || "Failed to load tracking links");
      }

      setLinks(res.data.links || []);
    } catch (err) {
      toast.error("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadMeta = async (link) => {
    const res = await apiClient.get(
      `/distribution/meta?pub_id=${pubId}&tracking_link_id=${link.tracking_link_id}`
    );
    if (res.data?.success) {
      setMeta(res.data.meta);
      setRequiredParams(res.data.meta.required_params || {});
    }
  };

  const loadRules = async (link) => {
    const res = await apiClient.get(
      `/distribution/rules?pub_id=${pubId}&tracking_link_id=${link.tracking_link_id}`
    );
    if (res.data?.success) {
      setRules(res.data.rules || []);
    }
  };

  const loadRemaining = async (link) => {
    const res = await apiClient.get(
      `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${link.tracking_link_id}`
    );
    if (res.data?.success) {
      setRemaining(res.data.remaining ?? 0);
    }
  };

  const loadOffers = async (meta) => {
    setLoadingOffers(true);
    try {
      const res = await apiClient.get("/offers");
      setOffers(res.data.offers || []);
    } catch {
      toast.error("Offers load failed");
    } finally {
      setLoadingOffers(false);
    }
  };

  const refreshAllForLink = async (link) => {
    await Promise.all([loadMeta(link), loadRules(link), loadRemaining(link)]);
    await loadOffers(meta);
  };

  const handleSelectLink = async (link) => {
    setSelectedLink(link);
    await refreshAllForLink(link);
  };

  /* --------------------------------------------------------
     PARAM TOGGLES
  -------------------------------------------------------- */

  const handleToggleParam = async (key) => {
    const next = { ...(requiredParams || {}), [key]: !requiredParams?.[key] };
    setRequiredParams(next);
    setSavingParams(true);

    try {
      await apiClient.put(
        `/distribution/update-required-params/${selectedLink.tracking_link_id}`,
        { required_params: next }
      );
    } catch {
      toast.error("Failed to update params");
    } finally {
      setSavingParams(false);
    }
  };

  /* --------------------------------------------------------
     PREVIEW
  -------------------------------------------------------- */

  const runPreview = async () => {
    setPreviewLoading(true);

    try {
      const res = await apiClient.get("/distribution/rotation/preview", {
        params: {
          pub_id: pubId,
          tracking_link_id: selectedLink.tracking_link_id,
          geo: meta.geo,
          carrier: meta.carrier,
        },
      });

      if (res.data?.success) setPreview(res.data);
    } catch {
      toast.error("Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  /* --------------------------------------------------------
     RULE CRUD
  -------------------------------------------------------- */

  const openAddRule = () => {
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const saveRule = async (form) => {
    setSavingRule(true);

    const payload = {
      pub_id: pubId,
      tracking_link_id: selectedLink.tracking_link_id,
      offer_id: Number(form.offerId), // INT always
      geo: form.geo || "ALL",
      carrier: form.carrier || "ALL",
      is_fallback: form.fallback,
      weight: form.weight ? Number(form.weight) : null,
      autoFill: !form.weight,
      status: form.status,
    };

    try {
      if (editingRule) {
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
        toast.success("Rule updated");
      } else {
        await apiClient.post("/distribution/rules", payload);
        toast.success("Rule added");
      }

      setShowRuleModal(false);
      await loadRules(selectedLink);
      await loadRemaining(selectedLink);
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (r) => {
    if (!window.confirm("Delete this rule?")) return;

    try {
      await apiClient.delete(`/distribution/rules/${r.id}`);
      await loadRules(selectedLink);
      await loadRemaining(selectedLink);
      toast.success("Rule deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  /* --------------------------------------------------------
     UI RENDER
  -------------------------------------------------------- */

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Traffic Distribution</h1>
      </div>

      {/* TOP BAR */}
      <div className="flex gap-4">
        <input
          className="border p-2 rounded"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          placeholder="PUB03"
        />

        <button
          onClick={loadTrackingLinks}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load
        </button>

        <input
          className="border p-2 rounded flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        
        {/* LIST LEFT */}
        <div className="col-span-1 border rounded p-2 space-y-2 h-[550px] overflow-auto">
          {filteredLinks.map((l) => (
            <div
              key={l.tracking_link_id}
              onClick={() => handleSelectLink(l)}
              className={classNames(
                "p-3 border rounded cursor-pointer",
                selectedLink?.tracking_link_id === l.tracking_link_id
                  ? "bg-blue-50 border-blue-500"
                  : "bg-white"
              )}
            >
              <div className="font-semibold">{l.tracking_id}</div>
              <div className="text-xs text-gray-500">
                {l.geo} · {l.carrier}
              </div>
              <div className="text-[11px] truncate text-gray-400">
                {l.tracking_url}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-2 space-y-6">

          {/* OVERVIEW */}
          <div className="border rounded p-4 bg-white space-y-3">
            <div className="flex justify-between">
              <div className="font-semibold">Overview</div>
              <div className="text-sm">Remaining: {remaining}%</div>
            </div>

            {meta && (
              <>
                <div className="text-sm">
                  GEO: <b>{meta.geo}</b> — Carrier: <b>{meta.carrier}</b>
                </div>

                <div>
                  <input
                    readOnly
                    value={finalTrackingUrl}
                    className="w-full border rounded p-2 text-xs font-mono"
                  />
                </div>

                {/* PARAM BUTTONS */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {PARAM_ORDER.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleToggleParam(key)}
                      className={classNames(
                        "px-3 py-1 rounded-full text-xs border",
                        requiredParams?.[key]
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : "bg-white border-gray-300 text-gray-500"
                      )}
                    >
                      {PARAM_LABELS[key]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RULES */}
          <div className="border rounded p-4 bg-white">
            <div className="flex justify-between mb-3">
              <h3 className="font-semibold">Rules</h3>

              <button
                onClick={openAddRule}
                className="bg-emerald-600 text-white px-3 py-2 rounded text-sm"
              >
                + Add Rule
              </button>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 text-left">Offer</th>
                  <th className="p-2 text-left">Geo</th>
                  <th className="p-2 text-left">Carrier</th>
                  <th className="p-2 text-left">%</th>
                  <th className="p-2">Fallback</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.offer_id}</td>
                    <td className="p-2">{r.geo}</td>
                    <td className="p-2">{r.carrier}</td>
                    <td className="p-2">{r.weight}%</td>
                    <td className="p-2">{r.is_fallback ? "YES" : "NO"}</td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2 text-right">
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
                    <td colSpan="7" className="text-center p-4 text-gray-400">
                      No rules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

          </div>
        </div>
      </div>

      {/* RULE MODAL */}
      {showRuleModal && (
        <RuleModal
          open={showRuleModal}
          onClose={() => setShowRuleModal(false)}
          onSave={saveRule}
          rule={editingRule}
          offers={offers}
          loadingOffers={loadingOffers}
          remaining={remaining}
          meta={meta}
          saving={savingRule}
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
  offers,
  remaining,
  saving,
  meta,
}) {
  const [offerId, setOfferId] = useState(rule?.offer_id || "");
  const [geo, setGeo] = useState(rule?.geo || meta?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || meta?.carrier || "ALL");
  const [weight, setWeight] = useState(rule?.weight ?? "");
  const [fallback, setFallback] = useState(!!rule?.is_fallback);
  const [status, setStatus] = useState(rule?.status || "active");

  const submit = (e) => {
    e.preventDefault();
    onSave({ offerId, geo, carrier, weight, fallback, status });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">

        <h3 className="font-semibold text-lg">
          {rule ? "Edit Rule" : "Add Rule"}
        </h3>

        <form onSubmit={submit} className="space-y-4">

          {/* OFFER */}
          <div>
            <label className="text-xs font-semibold">Offer</label>
            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="w-full border rounded p-2 text-sm"
            >
              <option value="">Select Offer</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* GEO */}
          <div>
            <label className="text-xs font-semibold">Geo</label>
            <input
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          {/* CARRIER */}
          <div>
            <label className="text-xs font-semibold">Carrier</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          {/* WEIGHT */}
          <div>
            <label className="text-xs font-semibold">
              Weight (%)
            </label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={`Blank = AutoFill (${remaining}% left)`}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fallback}
                onChange={(e) => setFallback(e.target.checked)}
              />
              Fallback Rule
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded p-2 text-sm"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="deleted">deleted</option>
            </select>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border px-4 py-2 rounded text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white px-4 py-2 rounded text-sm"
            >
              {saving ? "Saving…" : "Save Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
