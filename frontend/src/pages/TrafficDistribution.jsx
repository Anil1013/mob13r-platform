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
      return `${key}=${placeholder}`;
    });

  if (!activeParams.length) return baseUrl;

  const joiner = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${joiner}${activeParams.join("&")}`;
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
     DATA LOADERS
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
    } catch (err) {
      toast.error("Error loading overview");
    }
  };

  const loadRules = async (link) => {
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId.trim()}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) setRules(res.data.rules);
    } catch (err) {
      toast.error("Error loading rules");
    }
  };

  const loadRemaining = async (link) => {
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId.trim()}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) setRemaining(res.data.remaining || 0);
    } catch (_e) {}
  };

  const loadOffers = async (meta) => {
    if (!meta) return;
    setLoadingOffers(true);
    setOffers([]);

    try {
      const res = await apiClient.get("/offers", {
        params: {
          pub_id: pubId,
          geo: meta.geo,
          carrier: meta.carrier,
          status: "active",
        },
      });

      const list = res.data?.offers || res.data || [];
      setOffers(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error("Unable to load offers");
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleSelectLink = async (link) => {
    setSelectedLink(link);
    await Promise.all([
      loadMeta(link),
      loadRules(link),
      loadRemaining(link),
    ]);

    setTimeout(() => loadOffers(meta || link), 200);
  };

  /* --------------------------------------------------------
     PARAM TOGGLE
  -------------------------------------------------------- */

  const handleToggleParam = async (key) => {
    const next = {
      ...requiredParams,
      [key]: !requiredParams[key],
    };
    setRequiredParams(next);
    setSavingParams(true);

    try {
      await apiClient.put(`/distribution/update-required-params/${selectedLink.tracking_link_id}`, {
        required_params: next,
      });
    } catch (e) {
      toast.error("Failed to update params");
    }

    setSavingParams(false);
  };

  /* --------------------------------------------------------
     RULE SAVE
  -------------------------------------------------------- */

  const saveRule = async (form) => {
    if (!selectedLink) return;

    setSavingRule(true);

    try {
      const payload = {
        pub_id: pubId.trim(),
        tracking_link_id: selectedLink.tracking_link_id,

        /** 🔥 FIX 1 — Guarantee correct offer_id string */
        offer_id: String(form.offerId),

        geo: form.geo || "ALL",
        carrier: form.carrier || "ALL",
        is_fallback: form.fallback,
        weight: form.weight ? Number(form.weight) : null,
        autoFill: !form.weight,
        status: form.status,
      };

      if (editingRule) {
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
        toast.success("Rule updated");
      } else {
        await apiClient.post("/distribution/rules", payload);
        toast.success("Rule added");
      }

      setShowRuleModal(false);
      setEditingRule(null);

      await Promise.all([
        loadRules(selectedLink),
        loadRemaining(selectedLink),
      ]);
    } catch (err) {
      toast.error("Failed to save rule");
    }

    setSavingRule(false);
  };

  const openAddRule = () => {
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const deleteRule = async (rule) => {
    if (!window.confirm("Delete rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      toast.success("Deleted");
      loadRules(selectedLink);
      loadRemaining(selectedLink);
    } catch (_) {
      toast.error("Error deleting rule");
    }
  };

  /* --------------------------------------------------------
     UI
  -------------------------------------------------------- */

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Traffic Distribution</h1>
      </div>

      {/* LOAD + SEARCH */}
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs">Publisher ID</label>
          <input
            className="border px-2 py-1 rounded w-32"
            value={pubId}
            onChange={(e) => setPubId(e.target.value)}
          />
        </div>

        <button
          onClick={loadTrackingLinks}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load
        </button>

        <div className="flex-1">
          <label className="text-xs block">Search</label>
          <input
            className="border px-2 py-1 rounded w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-3 gap-6">
        {/* LEFT LIST */}
        <div className="col-span-1 border rounded p-3 space-y-1 max-h-[600px] overflow-auto">
          {filteredLinks.map((link) => (
            <button
              key={link.tracking_link_id}
              onClick={() => handleSelectLink(link)}
              className={classNames(
                "border rounded p-2 w-full text-left",
                selectedLink?.tracking_link_id === link.tracking_link_id
                  ? "bg-blue-100 border-blue-400"
                  : "bg-white"
              )}
            >
              <div className="font-semibold text-sm">{link.tracking_id}</div>
              <div className="text-xs text-gray-500">
                {link.geo} · {link.carrier}
              </div>
              <div className="text-[11px] text-gray-400">{link.tracking_url}</div>
            </button>
          ))}
        </div>

        {/* RIGHT SIDE */}
        <div className="col-span-2 space-y-6">
          {/* OVERVIEW */}
          {meta && (
            <div className="border rounded p-4 space-y-3">
              <h2 className="font-semibold text-sm">Overview</h2>

              <div className="text-sm">
                <b>Publisher:</b> {meta.pub_code} <br />
                <b>GEO:</b> {meta.geo} <br />
                <b>Carrier:</b> {meta.carrier}
              </div>

              <div>
                <b className="text-xs block">Tracking URL</b>
                <input
                  className="border w-full px-2 py-1 text-xs bg-gray-50"
                  readOnly
                  value={finalTrackingUrl}
                />
              </div>

              {/* PARAMS */}
              <div className="border-t pt-2">
                <b className="text-xs">Required Params</b>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PARAM_ORDER.map((k) => (
                    <button
                      key={k}
                      onClick={() => handleToggleParam(k)}
                      className={classNames(
                        "px-3 py-1 rounded-full text-xs border",
                        requiredParams[k]
                          ? "bg-green-100 border-green-400"
                          : "bg-white"
                      )}
                    >
                      {PARAM_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RULES */}
          {selectedLink && (
            <div className="border rounded p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold">Rules</h2>
                <button
                  onClick={openAddRule}
                  className="bg-emerald-600 text-white px-3 py-1 rounded text-xs"
                >
                  + Add Rule
                </button>
              </div>

              <table className="w-full text-xs border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1">Offer</th>
                    <th className="px-2 py-1">Geo</th>
                    <th className="px-2 py-1">Carrier</th>
                    <th className="px-2 py-1">Weight</th>
                    <th className="px-2 py-1">Fallback</th>
                    <th className="px-2 py-1">Status</th>
                    <th className="px-2 py-1">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-2 py-1 font-mono">{r.offer_id}</td>
                      <td className="px-2 py-1">{r.geo}</td>
                      <td className="px-2 py-1">{r.carrier}</td>
                      <td className="px-2 py-1">{r.weight}%</td>
                      <td className="px-2 py-1">{r.is_fallback ? "YES" : "NO"}</td>
                      <td className="px-2 py-1">{r.status}</td>

                      <td className="px-2 py-1">
                        <button onClick={() => openEditRule(r)} className="text-blue-600">
                          Edit
                        </button>
                        {" | "}
                        <button onClick={() => deleteRule(r)} className="text-red-600">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!rules.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-3 text-gray-400">
                        No rules added
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RULE MODAL */}
      {showRuleModal && (
        <RuleModal
          rule={editingRule}
          offers={offers}
          loadingOffers={loadingOffers}
          remaining={remaining}
          meta={meta}
          saving={savingRule}
          onSave={saveRule}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------
   RULE MODAL
-------------------------------------------------------- */

function RuleModal({ rule, offers, loadingOffers, remaining, meta, onSave, onClose, saving }) {
  const [offerId, setOfferId] = useState(rule?.offer_id || "");
  const [geo, setGeo] = useState(rule?.geo || meta?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || meta?.carrier || "ALL");
  const [weight, setWeight] = useState(rule?.weight ? String(rule.weight) : "");
  const [fallback, setFallback] = useState(rule?.is_fallback || false);
  const [status, setStatus] = useState(rule?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ offerId, geo, carrier, weight, fallback, status });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded p-4 w-full max-w-md space-y-3">
        <h2 className="text-sm font-semibold mb-2">
          {rule ? "Edit Rule" : "Add Rule"}
        </h2>

        {/* OFFER */}
        <div>
          <label className="text-xs font-semibold">Offer ID</label>
          <select
            className="border px-2 py-1 rounded w-full text-sm"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          >
            <option value="">Select Offer</option>

            {offers.map((o) => (
              <option key={o.offer_id || o.id} value={o.offer_id || o.id}>
                {(o.offer_id || o.id)} {o.name ? ` — ${o.name}` : ""}
              </option>
            ))}
          </select>

          {!loadingOffers && !offers.length && (
            <p className="text-[11px] text-amber-600">No offers loaded.</p>
          )}
        </div>

        {/* GEO + CARRIER */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold">GEO</label>
            <input
              className="border px-2 py-1 rounded w-full text-sm"
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold">Carrier</label>
            <input
              className="border px-2 py-1 rounded w-full text-sm"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
        </div>

        {/* WEIGHT */}
        <div>
          <label className="text-xs font-semibold">Weight (%)</label>
          <input
            className="border px-2 py-1 rounded w-full text-sm"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`Leave blank to AutoFill (${remaining}% available)`}
          />
        </div>

        {/* FALLBACK + STATUS */}
        <div className="flex items-center justify-between border-t pt-3">
          <label className="text-xs flex items-center gap-2">
            <input
              type="checkbox"
              checked={fallback}
              onChange={(e) => setFallback(e.target.checked)}
            />
            Fallback Rule
          </label>

          <select
            className="border px-2 py-1 rounded text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="deleted">deleted</option>
          </select>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1 bg-emerald-600 text-white rounded"
          >
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </form>
    </div>
  );
}
