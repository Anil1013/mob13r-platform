// File: frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

const PARAM_KEYS = [
  { key: "ip", label: "IP" },
  { key: "ua", label: "UA" },
  { key: "device", label: "Device" },
  { key: "msisdn", label: "MSISDN" },
  { key: "click_id", label: "Click ID" },
  { key: "sub1", label: "sub1" },
  { key: "sub2", label: "sub2" },
  { key: "sub3", label: "sub3" },
  { key: "sub4", label: "sub4" },
  { key: "sub5", label: "sub5" },
];

const pageSize = 10;

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const [selectedLink, setSelectedLink] = useState(null);

  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  const [ruleSearch, setRuleSearch] = useState("");
  const [page, setPage] = useState(1);

  // modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null); // null = add
  const [ruleForm, setRuleForm] = useState({
    offer_id: "",
    geo: "ALL",
    carrier: "ALL",
    device: "ALL",
    priority: 1,
    weight: 100,
    is_fallback: false,
  });
  const [savingRule, setSavingRule] = useState(false);

  // offers for dropdown
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerSearch, setOfferSearch] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  // required params
  const [paramsState, setParamsState] = useState({});
  const [savingParams, setSavingParams] = useState(false);

  /* ---------------- Load tracking links by PUB code ---------------- */

  const loadLinks = async () => {
    if (!pubCode.trim()) {
      alert("Enter PUB code (e.g. PUB03)");
      return;
    }
    setLinksLoading(true);
    setSelectedLink(null);
    setRules([]);
    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_code=${encodeURIComponent(pubCode.trim())}`
      );
      const items = res.data?.items || [];
      setLinks(items);
      if (items.length) {
        handleSelectLink(items[0]);
      }
    } catch (err) {
      console.error("Fetch tracking links error:", err);
      alert("Failed to load tracking links");
    } finally {
      setLinksLoading(false);
    }
  };

  const handleSelectLink = async (link) => {
    setSelectedLink(link);
    // set params from required_params
    const rp = link.required_params || {};
    const newState = {};
    PARAM_KEYS.forEach(({ key }) => {
      newState[key] = !!rp[key];
    });
    setParamsState(newState);
    setPage(1);
    await loadRules(link.id);
  };

  /* ---------------- Rules load / search / pagination --------------- */

  const loadRules = async (trackingLinkId) => {
    if (!trackingLinkId) return;
    setRulesLoading(true);
    try {
      const res = await apiClient.get(
        `/distribution/rules?tracking_link_id=${trackingLinkId}`
      );
      setRules(res.data?.items || []);
    } catch (err) {
      console.error("Fetch rules error:", err);
      alert("Failed to load rules");
    } finally {
      setRulesLoading(false);
    }
  };

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => {
      const offer = (r.offer_id || "") + " " + (r.offer_name || "");
      const adv = r.advertiser_name || "";
      const geo = r.geo || "";
      const carrier = r.carrier || "";
      return (
        offer.toLowerCase().includes(q) ||
        adv.toLowerCase().includes(q) ||
        geo.toLowerCase().includes(q) ||
        carrier.toLowerCase().includes(q)
      );
    });
  }, [rules, ruleSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));

  const paginatedRules = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRules.slice(start, start + pageSize);
  }, [filteredRules, page]);

  const totalWeight = useMemo(
    () => rules.reduce((sum, r) => sum + (Number(r.weight) || 0), 0),
    [rules]
  );

  /* --------------------- Offers dropdown --------------------------- */

  const loadOffers = async (search = "") => {
    setOffersLoading(true);
    try {
      const res = await apiClient.get(
        `/distribution/offers?search=${encodeURIComponent(search)}`
      );
      setOffers(res.data?.items || []);
    } catch (err) {
      console.error("Offers load error:", err);
      alert("Failed to load offers");
    } finally {
      setOffersLoading(false);
    }
  };

  useEffect(() => {
    // initial offers list
    loadOffers("");
  }, []);

  /* --------------------- Copy tracking URL ------------------------- */

  const handleCopyTrackingUrl = async () => {
    if (!selectedLink) {
      alert("Select a tracking link first");
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedLink.tracking_url);
      alert("Tracking URL copied");
    } catch (err) {
      console.error("Clipboard error:", err);
      alert("Could not copy tracking URL");
    }
  };

  /* --------------------- Required params save ---------------------- */

  const handleToggleParam = (key) => {
    setParamsState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveParams = async () => {
    if (!selectedLink) return;
    setSavingParams(true);
    try {
      await apiClient.put(
        `/distribution/tracking-links/${selectedLink.id}/params`,
        { required_params: paramsState }
      );
      alert("Default parameters updated");

      // update selectedLink + links array with new params
      const updatedLink = { ...selectedLink, required_params: paramsState };
      setSelectedLink(updatedLink);
      setLinks((prev) =>
        prev.map((l) => (l.id === updatedLink.id ? updatedLink : l))
      );
    } catch (err) {
      console.error("Save params error:", err);
      alert(
        err.response?.data?.message || "Failed to save default parameters"
      );
    } finally {
      setSavingParams(false);
    }
  };

  /* ---------------------- Rule modal helpers ----------------------- */

  const openAddRule = () => {
    if (!selectedLink) {
      alert("Select a tracking link first");
      return;
    }
    setEditingRule(null);
    setRuleForm({
      offer_id: "",
      geo: "ALL",
      carrier: selectedLink.carrier || "ALL",
      device: "ALL",
      priority: 1,
      weight: 100,
      is_fallback: false,
    });
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      offer_id: rule.offer_id,
      geo: rule.geo,
      carrier: rule.carrier,
      device: rule.device,
      priority: rule.priority,
      weight: rule.weight,
      is_fallback: rule.is_fallback,
    });
    setShowRuleModal(true);
  };

  const closeRuleModal = () => {
    setShowRuleModal(false);
    setEditingRule(null);
  };

  const handleRuleFormChange = (field, value) => {
    setRuleForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ---------------------- Rule save (add/edit) --------------------- */

  const handleSaveRule = async () => {
    if (!selectedLink) return;

    const payload = {
      pub_code: selectedLink.pub_code,
      tracking_link_id: selectedLink.id,
      offer_id: ruleForm.offer_id,
      geo: ruleForm.geo || "ALL",
      carrier: ruleForm.carrier || "ALL",
      device: ruleForm.device || "ALL",
      priority: Number(ruleForm.priority) || 1,
      weight: Number(ruleForm.weight) || 0,
      is_fallback: !!ruleForm.is_fallback,
    };

    if (!payload.offer_id) {
      alert("Select an offer");
      return;
    }

    setSavingRule(true);
    try {
      if (editingRule) {
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }

      await loadRules(selectedLink.id);
      closeRuleModal();
    } catch (err) {
      console.error("Add/Edit rule error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save rule";
      alert(msg);
    } finally {
      setSavingRule(false);
    }
  };

  /* ---------------------- Delete rule ------------------------------ */

  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Delete rule for offer ${rule.offer_id}?`)) return;

    setDeletingId(rule.id);
    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      await loadRules(selectedLink.id);
    } catch (err) {
      console.error("Delete rule error:", err);
      alert("Failed to delete rule");
    } finally {
      setDeletingId(null);
    }
  };

  /* ---------------------- Render ---------------------------------- */

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution</h1>

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="PUB03"
          className="border rounded px-3 py-2 min-w-[140px]"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value)}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={loadLinks}
          disabled={linksLoading}
        >
          {linksLoading ? "Loading..." : "Load Links"}
        </button>

        <button
          className="bg-gray-100 border px-4 py-2 rounded"
          onClick={handleCopyTrackingUrl}
        >
          Copy Tracking URL
        </button>

        {selectedLink && (
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Publisher:</span>{" "}
            {selectedLink.publisher_name} &nbsp;|&nbsp;
            <span className="font-semibold">Link:</span> {selectedLink.name}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tracking Links */}
        <div className="border rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Tracking Links</h3>
            <span className="text-xs text-gray-500">
              {links.length} link(s)
            </span>
          </div>

          {links.length === 0 && !linksLoading && (
            <p className="text-sm text-gray-500">No tracking links</p>
          )}

          {links.map((link) => (
            <div
              key={link.id}
              className={`p-3 border rounded cursor-pointer mb-2 text-sm ${
                selectedLink?.id === link.id
                  ? "bg-blue-100 border-blue-400"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => handleSelectLink(link)}
            >
              <div className="font-medium">
                {link.name} ({link.pub_code})
              </div>
              <div className="text-xs text-gray-600">
                {link.geo} • {link.carrier} • {link.type}
              </div>
            </div>
          ))}
        </div>

        {/* Rules + Params */}
        <div className="border rounded p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-semibold">Rules</h3>
              {selectedLink && (
                <div className="text-xs text-gray-500">
                  {selectedLink.name} ({selectedLink.pub_code})
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search rules..."
                className="border rounded px-2 py-1 text-sm"
                value={ruleSearch}
                onChange={(e) => {
                  setRuleSearch(e.target.value);
                  setPage(1);
                }}
              />
              <button
                className="bg-green-600 text-white px-3 py-1.5 rounded text-sm"
                onClick={openAddRule}
                disabled={!selectedLink}
              >
                + Add Rule
              </button>
            </div>
          </div>

          {/* Weight total */}
          <div
            className={`text-xs mb-2 ${
              totalWeight > 100 ? "text-red-600" : "text-gray-600"
            }`}
          >
            Total Weight:{" "}
            <span className="font-semibold">{totalWeight}</span> / 100
          </div>

          {/* Required params */}
          <div className="mb-3 border rounded p-2 bg-gray-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">
                Default Parameters (required_params)
              </span>
              <button
                className="text-xs px-2 py-1 rounded bg-gray-800 text-white"
                onClick={handleSaveParams}
                disabled={!selectedLink || savingParams}
              >
                {savingParams ? "Saving..." : "Save Params"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {PARAM_KEYS.map(({ key, label }) => (
                <label key={key} className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!!paramsState[key]}
                    onChange={() => handleToggleParam(key)}
                    disabled={!selectedLink}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Rules table */}
          {rulesLoading ? (
            <p className="text-sm text-gray-500">Loading rules...</p>
          ) : filteredRules.length === 0 ? (
            <p className="text-sm text-gray-500">
              {selectedLink
                ? "No rules for this tracking link"
                : "Select a tracking link to view rules"}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-2 text-left">Offer</th>
                      <th className="p-2 text-left">Advertiser</th>
                      <th className="p-2 text-left">Publisher</th>
                      <th className="p-2 text-left">Geo</th>
                      <th className="p-2 text-left">Carrier</th>
                      <th className="p-2 text-left">Device</th>
                      <th className="p-2 text-right">Priority</th>
                      <th className="p-2 text-right">Weight</th>
                      <th className="p-2 text-center">Fallback</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRules.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="p-2 align-top">
                          <div className="font-medium">{r.offer_id}</div>
                          <div className="text-[10px] text-gray-600">
                            {r.offer_name}
                          </div>
                        </td>
                        <td className="p-2 align-top">
                          <div className="text-[11px]">
                            {r.advertiser_name || "-"}
                          </div>
                        </td>
                        <td className="p-2 align-top">
                          <div className="text-[11px]">
                            {selectedLink?.publisher_name || "-"}
                          </div>
                        </td>
                        <td className="p-2">{r.geo}</td>
                        <td className="p-2">{r.carrier}</td>
                        <td className="p-2">{r.device}</td>
                        <td className="p-2 text-right">{r.priority}</td>
                        <td className="p-2 text-right">{r.weight}</td>
                        <td className="p-2 text-center">
                          {r.is_fallback ? "YES" : "NO"}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            className="text-blue-600 mr-2"
                            onClick={() => openEditRule(r)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600"
                            onClick={() => handleDeleteRule(r)}
                            disabled={deletingId === r.id}
                          >
                            {deletingId === r.id ? "..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-2 text-xs">
                <span>
                  Showing {Math.min((page - 1) * pageSize + 1, filteredRules.length)}{" "}
                  –{" "}
                  {Math.min(page * pageSize, filteredRules.length)} of{" "}
                  {filteredRules.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="border px-2 py-1 rounded disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </button>
                  <span>
                    Page {page} / {totalPages}
                  </span>
                  <button
                    className="border px-2 py-1 rounded disabled:opacity-50"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --------------------- Add/Edit Rule Modal ------------------- */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingRule ? "Edit Rule" : "Add Rule"}
            </h2>

            {/* Offer */}
            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">Offer</label>
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  placeholder="Search offer..."
                  className="border rounded px-2 py-1 text-sm flex-1"
                  value={offerSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOfferSearch(v);
                    loadOffers(v);
                  }}
                />
              </div>
              <select
                className="border rounded px-2 py-2 text-sm w-full"
                value={ruleForm.offer_id}
                onChange={(e) =>
                  handleRuleFormChange("offer_id", e.target.value)
                }
              >
                <option value="">Select offer</option>
                {offers.map((o) => (
                  <option key={o.offer_id} value={o.offer_id}>
                    {o.offer_id} — {o.name} ({o.advertiser_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Targeting row */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Geo</label>
                <input
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={ruleForm.geo}
                  onChange={(e) =>
                    handleRuleFormChange("geo", e.target.value || "ALL")
                  }
                  placeholder="ALL or e.g. BD"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Carrier
                </label>
                <input
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={ruleForm.carrier}
                  onChange={(e) =>
                    handleRuleFormChange("carrier", e.target.value || "ALL")
                  }
                  placeholder="ALL or e.g. ROBI"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Device
                </label>
                <input
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={ruleForm.device}
                  onChange={(e) =>
                    handleRuleFormChange("device", e.target.value || "ALL")
                  }
                  placeholder="ALL"
                />
              </div>
            </div>

            {/* Priority / Weight */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={ruleForm.priority}
                  onChange={(e) =>
                    handleRuleFormChange("priority", e.target.value)
                  }
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Weight
                </label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={ruleForm.weight}
                  onChange={(e) =>
                    handleRuleFormChange("weight", e.target.value)
                  }
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Fallback */}
            <div className="mb-4">
              <label className="inline-flex items-center text-sm">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={!!ruleForm.is_fallback}
                  onChange={(e) =>
                    handleRuleFormChange("is_fallback", e.target.checked)
                  }
                />
                Fallback Rule
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded border"
                onClick={closeRuleModal}
                disabled={savingRule}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={handleSaveRule}
                disabled={savingRule}
              >
                {savingRule ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
