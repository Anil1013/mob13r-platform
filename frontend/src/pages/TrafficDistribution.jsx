// src/pages/TrafficDistribution.jsx
import React, { useEffect, useState, useMemo } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";
import { Copy, Loader2, Search, X } from "lucide-react";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [loading, setLoading] = useState(false);

  const [trackingLinks, setTrackingLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);

  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(100);

  const [offers, setOffers] = useState([]);

  const [search, setSearch] = useState("");

  // Modal Control
  const [openModal, setOpenModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  /* ================================================================
     LOAD PUBLISHER TRACKING LINKS
  ================================================================== */
  const loadLinks = async () => {
    if (!pubId) return toast.error("Enter Publisher ID");

    try {
      setLoading(true);

      const res = await apiClient.get("/distribution/tracking-links", {
        params: { pub_id: pubId },
      });

      if (res.data.success) {
        setTrackingLinks(res.data.links);

        if (res.data.links.length === 0) {
          toast.warning("No links found for this publisher");
        }
      } else {
        toast.error(res.data.error || "Failed to load");
      }
    } catch (err) {
      toast.error("Error loading links");
    } finally {
      setLoading(false);
    }
  };

  /* ================================================================
     LOAD META + RULES + OFFERS
  ================================================================== */
  const loadMetaAndRules = async (link) => {
    if (!link) return;

    try {
      // META
      const metaRes = await apiClient.get("/distribution/meta", {
        params: {
          pub_id: pubId,
          tracking_link_id: link.tracking_link_id,
        },
      });

      if (metaRes.data.success) {
        setMeta(metaRes.data.meta);
      }

      // RULES
      const ruleRes = await apiClient.get("/distribution/rules", {
        params: {
          pub_id: pubId,
          tracking_link_id: link.tracking_link_id,
        },
      });

      if (ruleRes.data.success) {
        setRules(ruleRes.data.rules);
      }

      // REMAINING
      const rem = await apiClient.get("/distribution/rules/remaining", {
        params: {
          pub_id: pubId,
          tracking_link_id: link.tracking_link_id,
        },
      });

      setRemaining(rem.data.remaining || 0);

      // LOAD OFFERS (active only)
      const off = await apiClient.get("/offers/list");
      setOffers(off.data.offers || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed loading meta / rules");
    }
  };

  /* ================================================================
     REQUIRED PARAMS UPDATE
  ================================================================== */
  const toggleParam = async (key) => {
    if (!meta) return;

    const updated = {
      ...meta.required_params,
      [key]: !meta.required_params[key],
    };

    try {
      meta.required_params[key] = !meta.required_params[key];
      setMeta({ ...meta });

      await apiClient.put(
        `/distribution/update-required-params/${meta.tracking_link_id}`,
        { required_params: updated }
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed updating param");
    }
  };

  /* ================================================================
     RULE MODAL HANDLERS
  ================================================================== */
  const handleOpenAdd = () => {
    setEditingRule(null);
    setOpenModal(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete rule?")) return;

    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      toast.success("Rule deleted");
      loadMetaAndRules(selectedLink);
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  /* ================================================================
     URL PARAM BUILDER
  ================================================================== */
  const finalURL = useMemo(() => {
    if (!meta) return "";

    let url = meta.tracking_url;

    const params = meta.required_params || {};

    const enabled = Object.keys(params).filter((p) => params[p] === true);

    enabled.forEach((p) => {
      url += `&${p}={${p.toUpperCase()}}`;
    });

    return url;
  }, [meta]);

  /* ================================================================
     COPY
  ================================================================== */
  const copyURL = async () => {
    if (!finalURL) return;
    await navigator.clipboard.writeText(finalURL);
    toast.success("Copied!");
  };

  /* ================================================================
     UI
  ================================================================== */
  const filteredLinks = useMemo(() => {
    if (!search) return trackingLinks;
    return trackingLinks.filter((l) =>
      `${l.tracking_id} ${l.name} ${l.geo} ${l.carrier}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search, trackingLinks]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Traffic Distribution</h1>
      </div>

      {/* Publisher input */}
      <div className="mb-4 flex gap-3">
        <input
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          placeholder="Enter Publisher ID (PUB01...)"
          className="w-64 rounded border px-3 py-2"
        />
        <button
          onClick={loadLinks}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Load"}
        </button>
      </div>

      {/* Search Bar */}
      {trackingLinks.length > 0 && (
        <div className="mb-4">
          <div className="relative w-80">
            <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking links..."
              className="w-full rounded border px-8 py-2"
            />
          </div>
        </div>
      )}

      {/* Links list */}
      <div className="grid grid-cols-1 gap-4">
        {filteredLinks.map((l) => (
          <div
            key={l.tracking_link_id}
            className={`cursor-pointer rounded border p-4 ${
              selectedLink?.tracking_link_id === l.tracking_link_id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
            }`}
            onClick={() => {
              setSelectedLink(l);
              loadMetaAndRules(l);
            }}
          >
            <div className="font-semibold">{l.tracking_id}</div>
            <div className="text-sm text-gray-600">{l.tracking_url}</div>
          </div>
        ))}
      </div>

      {/* Overview section */}
      {meta && (
        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Overview</h2>
            <span className="text-green-600 font-semibold">
              Remaining Weight: {remaining}%
            </span>
          </div>

          {/* URL */}
          <div className="mt-2">
            <div className="font-medium">Tracking URL</div>

            <div className="mt-1 flex items-center gap-2">
              <input
                readOnly
                value={finalURL}
                className="w-full rounded border bg-gray-100 px-3 py-2 font-mono text-sm"
              />
              <button
                onClick={copyURL}
                className="rounded bg-gray-200 p-2 hover:bg-gray-300"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          {/* Required params */}
          <div className="mt-4">
            <div className="font-medium">Required Parameters</div>

            <div className="mt-2 flex flex-wrap gap-2">
              {Object.keys(meta.required_params || {}).map((k) => (
                <button
                  key={k}
                  onClick={() => toggleParam(k)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    meta.required_params[k]
                      ? "bg-green-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Rules</h3>
            <button
              className="rounded bg-green-600 px-4 py-2 text-white"
              onClick={handleOpenAdd}
            >
              + Add Rule
            </button>
          </div>

          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Offer</th>
                <th>GEO</th>
                <th>Carrier</th>
                <th>Weight</th>
                <th>Fallback</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-gray-500">
                    No rules yet.
                  </td>
                </tr>
              )}

              {rules.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2">{r.offer_id}</td>
                  <td>{r.geo}</td>
                  <td>{r.carrier}</td>
                  <td>{r.weight}%</td>
                  <td>{r.is_fallback ? "YES" : "NO"}</td>
                  <td>{r.status}</td>
                  <td>
                    <button
                      className="text-blue-600"
                      onClick={() => handleEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="ml-3 text-red-600"
                      onClick={() => handleDelete(r.id)}
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

      {/* RULE MODAL */}
      {openModal && (
        <RuleModal
          pubId={pubId}
          trackingLinkId={selectedLink?.tracking_link_id}
          offers={offers}
          rule={editingRule}
          remaining={remaining}
          onClose={() => setOpenModal(false)}
          onSaved={() => {
            setOpenModal(false);
            loadMetaAndRules(selectedLink);
          }}
        />
      )}
    </div>
  );
}

/* ================================================================
   RULE MODAL COMPONENT
================================================================== */
function RuleModal({
  rule,
  pubId,
  trackingLinkId,
  offers,
  remaining,
  onSaved,
  onClose,
}) {
  const [offerId, setOfferId] = useState(rule?.offer_id || "");
  const [geo, setGeo] = useState(rule?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || "ALL");
  const [weight, setWeight] = useState(rule?.weight || "");
  const [fallback, setFallback] = useState(rule?.is_fallback || false);
  const [status, setStatus] = useState(rule?.status || "active");

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!offerId) return toast.error("Select Offer");

    const payload = {
      pub_id: pubId,
      tracking_link_id: trackingLinkId,
      offer_id: offerId, // FIXED → sends OFF01, OFF02
      geo,
      carrier,
      is_fallback: fallback,
      weight: weight ? Number(weight) : null,
      autoFill: !weight,
      status,
    };

    try {
      setSaving(true);

      if (rule) {
        await apiClient.put(`/distribution/rules/${rule.id}`, payload);
      } else {
        await apiClient.post(`/distribution/rules`, payload);
      }

      toast.success("Rule saved!");
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error("Failed saving rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {rule ? "Edit Rule" : "Add Distribution Rule"}
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* OFFER */}
        <div className="mt-4">
          <label className="text-sm font-medium">Offer ID *</label>

          <select
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">Select Offer (OFF01, OFF02...)</option>

            {offers.map((o) => (
              <option key={o.offer_id} value={o.offer_id}>
                {o.offer_id} — {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* GEO + CARRIER */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">GEO</label>
            <input
              value={geo}
              onChange={(e) => setGeo(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm">Carrier</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        </div>

        {/* WEIGHT */}
        <div className="mt-4">
          <label className="text-sm">Weight (%)</label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`Leave blank for AutoFill (Remaining ${remaining}%)`}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        {/* FALLBACK + STATUS */}
        <div className="mt-4 flex justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fallback}
              onChange={(e) => setFallback(e.target.checked)}
            />
            Fallback rule
          </label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="deleted">deleted</option>
          </select>
        </div>

        {/* BUTTONS */}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-green-600 px-4 py-2 text-white"
          >
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
