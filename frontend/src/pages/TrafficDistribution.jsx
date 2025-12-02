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
    setPreview(null);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${pubId.trim()}`
      );

      if (!res.data?.success) {
        toast.error(res.data?.error || "Failed to load tracking links");
        return;
      }

      setLinks(res.data.links || []);
    } catch (err) {
      toast.error("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadMeta = async (link) => {
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${pubId.trim()}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) {
        setMeta(res.data.meta);
        setRequiredParams(res.data.meta.required_params || {});
      }
    } catch {}
  };

  const loadRules = async (link) => {
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId.trim()}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) {
        setRules(res.data.rules || []);
      }
    } catch {}
  };

  const loadRemaining = async (link) => {
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId.trim()}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) setRemaining(res.data.remaining || 0);
    } catch {}
  };

  const loadOffers = async (meta) => {
    if (!meta) return;
    setLoadingOffers(true);

    try {
      const res = await apiClient.get("/distribution/offers");

      const list = res.data?.offers || [];
      setOffers(list);
    } catch (e) {
      toast.error("Failed loading offers");
    } finally {
      setLoadingOffers(false);
    }
  };

  const refreshAllForLink = async (link) => {
    await Promise.all([loadMeta(link), loadRules(link), loadRemaining(link)]);
    loadOffers(meta);
  };

  const handleSelectLink = (link) => {
    setSelectedLink(link);
    refreshAllForLink(link);
  };

  /* --------------------------------------------------------
     PARAM TOGGLES
  -------------------------------------------------------- */

  const handleToggleParam = async (key) => {
    const next = { ...requiredParams, [key]: !requiredParams[key] };
    setRequiredParams(next);
    setSavingParams(true);

    try {
      await apiClient.put(
        `/distribution/update-required-params/${selectedLink.tracking_link_id}`,
        { required_params: next }
      );
    } finally {
      setSavingParams(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(finalTrackingUrl);
    toast.success("Copied");
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
      pub_id: pubId.trim(),
      tracking_link_id: selectedLink.tracking_link_id,
      offer_id: form.offerId, // already pure OFF02
      geo: form.geo || "ALL",
      carrier: form.carrier || "ALL",
      is_fallback: form.fallback,
      status: form.status,
      weight: form.weight ? Number(form.weight) : null,
      autoFill: !form.weight,
    };

    try {
      if (editingRule) {
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
        toast.success("Rule updated");
      } else {
        await apiClient.post(`/distribution/rules`, payload);
        toast.success("Rule added");
      }

      setShowRuleModal(false);
      await loadRules(selectedLink);
      await loadRemaining(selectedLink);
    } catch (err) {
      toast.error("Failed saving rule");
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm("Delete this rule?")) return;

    await apiClient.delete(`/distribution/rules/${rule.id}`);
    await loadRules(selectedLink);
    await loadRemaining(selectedLink);
  };

  /* --------------------------------------------------------
     UI
  -------------------------------------------------------- */

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Traffic Distribution</h1>
      </div>

      {/* PUB ID */}
      <div className="flex gap-4">
        <input
          className="border px-3 py-2"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
        />

        <button
          onClick={loadTrackingLinks}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* LEFT LIST */}
        <div className="col-span-1 space-y-2 border p-2 rounded">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <LinkIcon size={16} /> Tracking Links
          </h2>

          <div className="max-h-[500px] overflow-auto space-y-2">
            {filteredLinks.map((link) => {
              const active = selectedLink?.tracking_link_id === link.tracking_link_id;
              return (
                <button
                  key={link.tracking_link_id}
                  onClick={() => handleSelectLink(link)}
                  className={`w-full text-left border px-3 py-2 rounded ${
                    active ? "bg-blue-100 border-blue-500" : "bg-white"
                  }`}
                >
                  <div className="font-bold">{link.tracking_id}</div>
                  <div className="text-xs text-gray-500">
                    {link.geo} · {link.carrier}
                  </div>
                  <div className="text-xs truncate">{link.tracking_url}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-span-2 space-y-6">

          {/* OVERVIEW */}
          <div className="border rounded p-4 space-y-3">
            <h2 className="font-semibold text-sm">Overview</h2>

            {meta && (
              <>
                <div className="grid grid-cols-2 text-sm">
                  <div>Publisher: {meta.pub_code}</div>
                  <div>Geo: {meta.geo}</div>
                  <div>Carrier: {meta.carrier}</div>
                </div>

                <div>
                  <label className="text-xs font-semibold">Tracking URL</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border px-2 py-1 text-xs"
                      readOnly
                      value={finalTrackingUrl}
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="border px-2 py-1"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PARAM_ORDER.map((key) => {
                    const active = requiredParams[key];
                    return (
                      <button
                        key={key}
                        onClick={() => handleToggleParam(key)}
                        className={`px-3 py-1 rounded text-xs border ${
                          active
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        {PARAM_LABELS[key]}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={runPreview}
                  className="bg-black text-white px-3 py-2 text-xs rounded"
                >
                  Rotation Preview
                </button>

                {preview && (
                  <div className="text-xs">
                    Selected: <b>{preview.selected?.offer_id || "None"}</b>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RULES */}
          <div className="border rounded p-4 space-y-3">
            <div className="flex justify-between">
              <h2 className="text-sm font-semibold">Rules</h2>
              <button
                onClick={openAddRule}
                className="bg-emerald-600 text-white px-3 py-2 rounded text-xs"
              >
                <Plus size={14} /> Add Rule
              </button>
            </div>

            <table className="w-full text-xs border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Offer</th>
                  <th className="p-2 border">Geo</th>
                  <th className="p-2 border">Carrier</th>
                  <th className="p-2 border">Weight</th>
                  <th className="p-2 border">Fallback</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border"></th>
                </tr>
              </thead>

              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 border">{r.offer_id}</td>
                    <td className="p-2 border">{r.geo}</td>
                    <td className="p-2 border">{r.carrier}</td>
                    <td className="p-2 border">{r.weight}%</td>
                    <td className="p-2 border">{r.is_fallback ? "YES" : "NO"}</td>
                    <td className="p-2 border">{r.status}</td>
                    <td className="p-2 border text-right">
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
                    <td className="p-2 text-center text-gray-500" colSpan={7}>
                      No rules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
   RULE MODAL — FINAL FIXED VERSION
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
  const [weight, setWeight] = useState(rule?.weight != null ? String(rule.weight) : "");
  const [fallback, setFallback] = useState(rule?.is_fallback || false);
  const [status, setStatus] = useState(rule?.status || "active");

  const submit = (e) => {
    e.preventDefault();

    // PURE OFFER ID ALWAYS (OFF01)
    const cleanOffer = offerId.split("—")[0].trim();

    onSave({
      offerId: cleanOffer,
      geo,
      carrier,
      weight,
      fallback,
      status,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
        <div className="border-b p-4 flex justify-between">
          <h2 className="font-semibold text-sm">
            {rule ? "Edit Rule" : "Add Distribution Rule"}
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-4">

          {/* OFFER */}
          <div>
            <label className="text-xs font-semibold">Offer ID *</label>
            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="border px-3 py-2 w-full rounded"
            >
              <option value="">Select Offer</option>

              {offers.map((o) => (
                <option key={o.offer_id} value={o.offer_id}>
                  {o.offer_id + (o.name ? ` — ${o.name}` : "")}
                </option>
              ))}
            </select>
          </div>

          {/* GEO & CARRIER */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">GEO</label>
              <input
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                className="border px-2 py-2 w-full rounded"
              />
            </div>

            <div>
              <label className="text-xs font-semibold">Carrier</label>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="border px-2 py-2 w-full rounded"
              />
            </div>
          </div>

          {/* WEIGHT */}
          <div>
            <label className="text-xs font-semibold">Weight (%)</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={`Empty = AutoFill (Remaining ${remaining}%)`}
              className="border px-3 py-2 w-full rounded"
            />
          </div>

          {/* FALLBACK & STATUS */}
          <div className="flex justify-between border-t pt-3">
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
              className="border px-2 py-2 rounded"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="deleted">deleted</option>
            </select>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-4 border-t pt-3">
            <button onClick={onClose} type="button" className="px-4 py-2 border rounded">
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded"
            >
              {saving ? "Saving..." : "Save Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
