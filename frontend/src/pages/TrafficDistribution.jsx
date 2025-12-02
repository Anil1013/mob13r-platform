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
     LOAD FUNCTIONS
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
        toast.error(res.data?.error || "Failed to load");
        return;
      }
      setLinks(res.data.links || []);
    } catch (e) {
      toast.error("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadMeta = async (link) => {
    if (!link) return;
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
    if (!link) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId.trim()}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) setRules(res.data.rules || []);
    } catch {}
  };

  const loadRemaining = async (link) => {
    if (!link) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId.trim()}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) setRemaining(res.data.remaining || 0);
    } catch {}
  };

  /* --------------------------------------------------------
     FIXED OFFER FETCH
     Correct route = "/distribution/offers"
  -------------------------------------------------------- */

  const loadOffers = async (linkMeta) => {
    if (!linkMeta) return;
    setLoadingOffers(true);
    setOffers([]);
    try {
      const res = await apiClient.get("/distribution/offers");
      const list = res.data?.offers || [];
      setOffers(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error("Unable to load offers");
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
    refreshAllForLink(link);
  };

  /* --------------------------------------------------------
     PARAM TOGGLE
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
    } catch (e) {
      toast.error("Failed updating params");
    } finally {
      setSavingParams(false);
    }
  };

  /* --------------------------------------------------------
     PREVIEW
  -------------------------------------------------------- */

  const runPreview = async () => {
    if (!selectedLink || !meta) return;
    setPreviewLoading(true);
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
    if (!selectedLink) return;
    setSavingRule(true);
    try {
      const payload = {
        pub_id: pubId.trim(),
        tracking_link_id: selectedLink.tracking_link_id,
        offer_id: form.offerId,
        geo: form.geo || "ALL",
        carrier: form.carrier || "ALL",
        is_fallback: form.fallback,
        weight: form.weight ? Number(form.weight) : null,
        autoFill: !form.weight,
        status: form.status,
      };

      if (editingRule)
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
      else
        await apiClient.post("/distribution/rules", payload);

      toast.success("Saved");
      setShowRuleModal(false);
      setEditingRule(null);
      refreshAllForLink(selectedLink);
    } catch {
      toast.error("Save failed");
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm("Delete rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      toast.success("Rule deleted");
      refreshAllForLink(selectedLink);
    } catch {
      toast.error("Delete failed");
    }
  };

  /* --------------------------------------------------------
     RENDER UI
  -------------------------------------------------------- */

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Traffic Distribution</h1>
      </div>

      {/* TOP BAR */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">

        <div className="flex-1">
          <label className="text-xs">Publisher ID</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={pubId}
            onChange={(e) => setPubId(e.target.value)}
          />
        </div>

        <button
          onClick={loadTrackingLinks}
          disabled={loadingLinks}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loadingLinks ? "Loading..." : "Load"}
        </button>

        <div className="flex-1 md:max-w-md">
          <label className="text-xs">Search</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT LIST */}
        <div className="space-y-2 max-h-[500px] overflow-auto">
          {filteredLinks.map((link) => {
            const active = selectedLink?.tracking_link_id === link.tracking_link_id;
            return (
              <button
                key={link.tracking_link_id}
                onClick={() => handleSelectLink(link)}
                className={`w-full border rounded p-2 text-left ${
                  active ? "border-blue-600 bg-blue-50" : "border-gray-200"
                }`}
              >
                <div className="font-semibold">{link.tracking_id}</div>
                <div className="text-xs text-gray-500">
                  {link.geo} · {link.carrier}
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-2 space-y-4">

          {/* OVERVIEW CARD */}
          <div className="border rounded p-4 bg-white shadow">

            {meta ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>Publisher: <b>{meta.pub_code}</b></div>
                  <div>Geo: <b>{meta.geo}</b></div>
                  <div>Carrier: <b>{meta.carrier}</b></div>
                  <div>Remaining: <b>{remaining}%</b></div>
                </div>

                <div className="mt-3">
                  <label className="text-xs">Tracking URL</label>
                  <input className="w-full border rounded px-2 py-1 text-xs"
                    readOnly
                    value={finalTrackingUrl}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {PARAM_ORDER.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleToggleParam(key)}
                      className={`px-3 py-1 rounded text-xs border ${
                        requiredParams[key]
                          ? "bg-emerald-100 border-emerald-400"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {PARAM_LABELS[key]}
                    </button>
                  ))}
                </div>

                <button
                  onClick={runPreview}
                  className="mt-3 bg-black text-white px-3 py-2 rounded text-xs"
                >
                  Rotation Preview
                </button>

                {preview && (
                  <div className="mt-2 text-xs text-gray-600">
                    Selected Offer: {preview.selected?.offer_id}
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-500">
                Select a tracking link
              </div>
            )}
          </div>

          {/* RULES CARD */}
          <div className="border rounded p-4 bg-white shadow">

            <div className="flex justify-between mb-3">
              <h2 className="text-sm font-semibold">Rules</h2>

              <button
                onClick={openAddRule}
                disabled={!selectedLink}
                className="bg-emerald-600 text-white px-3 py-1.5 text-xs rounded"
              >
                + Add Rule
              </button>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-3 py-2">Offer ID</th>
                  <th className="px-3 py-2">Geo</th>
                  <th className="px-3 py-2">Carrier</th>
                  <th className="px-3 py-2">Weight</th>
                  <th className="px-3 py-2">Fallback</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-3 py-2 font-mono">{r.offer_id}</td>
                    <td className="px-3 py-2">{r.geo}</td>
                    <td className="px-3 py-2">{r.carrier}</td>
                    <td className="px-3 py-2">{r.weight}%</td>
                    <td className="px-3 py-2">{r.is_fallback ? "YES" : "NO"}</td>
                    <td className="px-3 py-2">{r.status}</td>

                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        className="text-blue-600"
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
                    <td colSpan={7} className="text-center text-gray-400 py-3">
                      No rules yet
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
          onClose={() => !savingRule && setShowRuleModal(false)}
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
   RULE MODAL
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
  // ⭐ FIXED: always string
  const [offerId, setOfferId] = useState(rule?.offer_id?.toString() || "");

  const [geo, setGeo] = useState(rule?.geo || meta?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || meta?.carrier || "ALL");
  const [weight, setWeight] = useState(rule?.weight ? String(rule.weight) : "");
  const [fallback, setFallback] = useState(!!rule?.is_fallback);
  const [status, setStatus] = useState(rule?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ offerId, geo, carrier, weight, fallback, status });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-xl shadow">
        <h2 className="text-lg font-semibold mb-2">
          {rule ? "Edit Rule" : "Add Rule"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* OFFER SELECT */}
          <div>
            <label className="text-xs font-semibold">Offer</label>
            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select Offer</option>

              {offers.map((o) => (
                <option key={o.offer_id} value={o.offer_id}>
                  {o.offer_id} — {o.name}
                </option>
              ))}
            </select>

            {loadingOffers && (
              <p className="text-xs text-gray-400">Loading offers...</p>
            )}
          </div>

          {/* GEO + CARRIER */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold">Geo</label>
              <input
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold">Carrier</label>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* WEIGHT */}
          <div>
            <label className="text-xs font-semibold">Weight (%)</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={`Leave blank for AutoFill (${remaining}% left)`}
            />
          </div>

          {/* FALLBACK + STATUS */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fallback}
                onChange={(e) => setFallback(e.target.checked)}
              />
              Fallback rule
            </label>

            <div>
              <label className="text-xs font-semibold">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm"
              >
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="deleted">deleted</option>
              </select>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              {saving ? "Saving..." : "Save Rule"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
