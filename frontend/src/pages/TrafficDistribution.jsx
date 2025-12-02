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

/* ============================================================
   CONSTANTS
============================================================ */

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

/* ============================================================
   UTIL
============================================================ */

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function buildFinalUrl(baseUrl, requiredParams) {
  if (!baseUrl) return "";

  const pairs = Object.entries(requiredParams || {})
    .filter(([, v]) => v)
    .map(([key]) => `${key}=${PARAM_PLACEHOLDERS[key]}`);

  if (!pairs.length) return baseUrl;

  const joiner = baseUrl.includes("?") ? "&" : "?";
  return baseUrl + joiner + pairs.join("&");
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

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

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [savingRule, setSavingRule] = useState(false);

  const filteredLinks = useMemo(() => {
    if (!search) return links;
    const q = search.toLowerCase();
    return links.filter(
      (l) =>
        l.tracking_id.toLowerCase().includes(q) ||
        (l.publisher_name ?? "").toLowerCase().includes(q) ||
        (l.tracking_url ?? "").toLowerCase().includes(q)
    );
  }, [links, search]);

  const finalTrackingUrl = useMemo(
    () =>
      buildFinalUrl(
        meta?.tracking_url || selectedLink?.tracking_url || "",
        requiredParams
      ),
    [meta, selectedLink, requiredParams]
  );

  /* ============================================================
     LOADERS
  ============================================================ */

  const loadTrackingLinks = async () => {
    if (!pubId.trim()) return toast.error("Publisher ID required");

    setLoadingLinks(true);
    setSelectedLink(null);
    setMeta(null);
    setRules([]);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${pubId}`
      );
      if (res.data.success) {
        setLinks(res.data.links);
      }
    } catch {
      toast.error("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadMeta = async (link) => {
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${pubId}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data.success) {
        setMeta(res.data.meta);
        setRequiredParams(res.data.meta.required_params || {});
      }
    } catch {
      toast.error("Failed to load meta");
    }
  };

  const loadRules = async (link) => {
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data.success) setRules(res.data.rules);
    } catch {
      toast.error("Failed to load rules");
    }
  };

  const loadRemaining = async (link) => {
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data.success) setRemaining(res.data.remaining);
    } catch {}
  };

  const loadOffers = async (metaObj) => {
    if (!metaObj) return;
    setLoadingOffers(true);

    try {
      const res = await apiClient.get("/offers", {
        params: {
          pub_id: pubId,
          geo: metaObj.geo,
          carrier: metaObj.carrier,
        },
      });

      const list = res.data?.offers || [];
      setOffers(list);
    } catch {
      toast.error("Failed to load offers");
    } finally {
      setLoadingOffers(false);
    }
  };

  const refreshAllForLink = async (link) => {
    await loadMeta(link);
    await loadRules(link);
    await loadRemaining(link);

    setTimeout(() => {
      setMeta((m) => {
        if (m) loadOffers(m);
        return m;
      });
    }, 50);
  };

  const handleSelectLink = async (link) => {
    setSelectedLink(link);
    await refreshAllForLink(link);
  };

  /* ============================================================
     PARAMS
  ============================================================ */

  const handleToggleParam = async (key) => {
    const updated = { ...requiredParams, [key]: !requiredParams[key] };
    setRequiredParams(updated);

    setSavingParams(true);
    try {
      await apiClient.put(
        `/distribution/update-required-params/${selectedLink.tracking_link_id}`,
        { required_params: updated }
      );
    } catch {
      toast.error("Failed to save params");
    } finally {
      setSavingParams(false);
    }
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(finalTrackingUrl);
    toast.success("Copied");
  };

  /* ============================================================
     RULE CRUD
  ============================================================ */

  const openAddRule = () => {
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const openEditRule = (r) => {
    setEditingRule(r);
    setShowRuleModal(true);
  };

  const saveRule = async (form) => {
    setSavingRule(true);
    try {
      const payload = {
        pub_id: pubId,
        tracking_link_id: selectedLink.tracking_link_id,
        offer_id: form.offerId,
        geo: form.geo,
        carrier: form.carrier,
        weight: form.weight ? Number(form.weight) : null,
        autoFill: !form.weight,
        is_fallback: form.fallback,
        status: form.status,
      };

      if (!form.offerId) {
        toast.error("Offer required");
        return;
      }

      if (editingRule) {
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }

      toast.success("Rule saved");
      setShowRuleModal(false);
      setEditingRule(null);
      await loadRules(selectedLink);
      await loadRemaining(selectedLink);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm("Delete rule?")) return;
    await apiClient.delete(`/distribution/rules/${rule.id}`);
    await loadRules(selectedLink);
    await loadRemaining(selectedLink);
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <h1 className="text-2xl font-semibold">Traffic Distribution</h1>

      {/* TOP BAR */}
      <div className="flex gap-3">
        <input
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          className="border px-3 py-2 rounded-md"
        />

        <button
          onClick={loadTrackingLinks}
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Load
        </button>

        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded-md flex-1"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* LEFT LIST */}
        <div className="col-span-1 space-y-2">
          {filteredLinks.map((link) => (
            <button
              key={link.tracking_link_id}
              onClick={() => handleSelectLink(link)}
              className={`w-full text-left border px-3 py-2 rounded-md ${
                selectedLink?.tracking_link_id === link.tracking_link_id
                  ? "bg-blue-50 border-blue-500"
                  : "bg-white"
              }`}
            >
              <div className="font-semibold">{link.tracking_id}</div>
              <div className="text-xs text-gray-600">
                {link.geo} · {link.carrier}
              </div>
            </button>
          ))}
        </div>

        {/* RIGHT */}
        <div className="col-span-2 space-y-4">

          {/* OVERVIEW */}
          {meta && (
            <div className="border rounded-lg p-4 space-y-3">

              <div className="text-sm">
                <div>
                  <b>Geo:</b> {meta.geo}
                </div>
                <div>
                  <b>Carrier:</b> {meta.carrier}
                </div>
              </div>

              <div>
                <input
                  readOnly
                  value={finalTrackingUrl}
                  className="w-full border px-3 py-2 rounded-md text-xs font-mono"
                />
                <button
                  onClick={copyUrl}
                  className="mt-2 bg-gray-800 text-white px-3 py-1 rounded-md text-xs"
                >
                  Copy URL
                </button>
              </div>

              {/* PARAM BUTTONS */}
              <div className="flex flex-wrap gap-2">
                {PARAM_ORDER.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleToggleParam(p)}
                    className={`px-3 py-1 rounded-full border text-xs ${
                      requiredParams[p]
                        ? "bg-green-100 border-green-500"
                        : "bg-white"
                    }`}
                  >
                    {PARAM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* RULES */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between mb-3">
              <h2 className="font-semibold text-sm">Rules</h2>
              <button
                onClick={openAddRule}
                className="bg-green-600 text-white px-3 py-1 rounded-md text-xs"
              >
                Add Rule
              </button>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Offer</th>
                  <th>Geo</th>
                  <th>Carrier</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td>{r.offer_id}</td>
                    <td>{r.geo}</td>
                    <td>{r.carrier}</td>
                    <td>{r.weight}%</td>
                    <td>{r.status}</td>
                    <td className="text-right">
                      <button
                        onClick={() => openEditRule(r)}
                        className="text-blue-600 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRule(r)}
                        className="text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!rules.length && (
                  <tr>
                    <td colSpan="6" className="text-center text-gray-400 py-4">
                      No rules found
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
          rule={editingRule}
          onClose={() => setShowRuleModal(false)}
          onSave={saveRule}
          offers={offers}
          loadingOffers={loadingOffers}
          meta={meta}
          remaining={remaining}
          saving={savingRule}
        />
      )}
    </div>
  );
}

/* ============================================================
   RULE MODAL
============================================================ */

function RuleModal({
  rule,
  onClose,
  onSave,
  offers,
  loadingOffers,
  meta,
  remaining,
  saving,
}) {
  const [offerId, setOfferId] = useState(rule?.offer_id || "");
  const [geo, setGeo] = useState(rule?.geo || meta.geo || "ALL");
  const [carrier, setCarrier] = useState(
    rule?.carrier || meta.carrier || "ALL"
  );
  const [weight, setWeight] = useState(rule?.weight || "");
  const [fallback, setFallback] = useState(rule?.is_fallback || false);
  const [status, setStatus] = useState(rule?.status || "active");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-5 space-y-4">

        <h2 className="font-semibold text-sm">
          {rule ? "Edit Rule" : "Add Rule"}
        </h2>

        {/* OFFER */}
        <div>
          <label className="text-xs font-semibold">Offer</label>
          <select
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            className="w-full border px-3 py-2 rounded-md text-sm"
          >
            <option value="">Select Offer</option>
            {offers.map((o) => (
              <option key={o.offer_id} value={o.offer_id}>
                {o.offer_id} — {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* GEO + CARRIER */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold">GEO</label>
            <input
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="w-full border px-3 py-2 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold">Carrier</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full border px-3 py-2 rounded-md text-sm"
            />
          </div>
        </div>

        {/* WEIGHT */}
        <div>
          <label className="text-xs font-semibold">Weight %</label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`Blank = AutoFill (${remaining}% left)`}
            className="w-full border px-3 py-2 rounded-md text-sm"
          />
        </div>

        {/* FALLBACK */}
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={fallback}
            onChange={(e) => setFallback(e.target.checked)}
          />
          Fallback
        </label>

        {/* STATUS */}
        <div>
          <label className="text-xs font-semibold">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border px-3 py-2 rounded-md text-sm"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="deleted">deleted</option>
          </select>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="border px-4 py-2 rounded-md text-sm"
          >
            Cancel
          </button>

          <button
            disabled={saving}
            onClick={() =>
              onSave({ offerId, geo, carrier, weight, fallback, status })
            }
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm"
          >
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
