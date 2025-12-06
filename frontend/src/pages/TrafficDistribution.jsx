// File: frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

// Master list of available parameters for tracking URL
const PARAM_MASTER = [
  { key: "click_id", label: "click_id" },
  { key: "ip", label: "ip" },
  { key: "device", label: "device" },
  { key: "msisdn", label: "msisdn" },
  { key: "sub1", label: "sub1" },
  { key: "sub2", label: "sub2" },
  { key: "sub3", label: "sub3" },
  { key: "sub4", label: "sub4" },
  { key: "sub5", label: "sub5" },
];

const PAGE_SIZE = 10;
const BACKEND_CLICK_BASE = "https://backend.mob13r.com/click";

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const [selectedLink, setSelectedLink] = useState(null);

  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSearch, setRulesSearch] = useState("");
  const [rulesPage, setRulesPage] = useState(1);

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerSearch, setOfferSearch] = useState("");

  // Rule modal state
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRuleId, setCurrentRuleId] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    offer_id: "",
    geo: "ALL",
    carrier: "ALL",
    device: "ALL",
    priority: 1,
    weight: 100,
    is_fallback: false,
  });
  const [ruleError, setRuleError] = useState("");

  // Parameters for URL
  const [selectedParams, setSelectedParams] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");

  // Right panel resizable width
  const [rightWidth, setRightWidth] = useState(58); // percentage
  const [isResizing, setIsResizing] = useState(false);

  /* ----------------------------------------------------
     Load tracking links by PUB code
  ---------------------------------------------------- */
  const loadLinks = async () => {
    if (!pubCode) {
      alert("Enter PUB Code (e.g. PUB03)");
      return;
    }

    setLinksLoading(true);
    setSelectedLink(null);
    setRules([]);
    setRulesSearch("");
    setRulesPage(1);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_code=${encodeURIComponent(pubCode)}`
      );
      const items = res.data?.items || [];
      setLinks(items);

      // Auto-select first link (optional)
      if (items.length > 0) {
        handleSelectLink(items[0]);
      }
    } catch (err) {
      console.error("Fetch tracking links error:", err);
      alert("Failed to load tracking links");
    } finally {
      setLinksLoading(false);
    }
  };

  /* ----------------------------------------------------
     Load rules for a selected link
  ---------------------------------------------------- */
  const loadRules = async (link) => {
    if (!link) return;
    setRulesLoading(true);
    setRules([]);
    setRulesSearch("");
    setRulesPage(1);

    try {
      const res = await apiClient.get(
        `/distribution/rules?tracking_link_id=${link.id}`
      );
      const items = res.data?.items || [];
      setRules(items);
    } catch (err) {
      console.error("Fetch rules error:", err);
      alert("Failed to load rules");
    } finally {
      setRulesLoading(false);
    }
  };

  const handleSelectLink = (link) => {
    setSelectedLink(link);
    loadRules(link);

    // initialise parameters from link.required_params
    const parsed = parseRequiredParams(link?.required_params);
    setSelectedParams(parsed);
  };

  function parseRequiredParams(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter((k) => PARAM_MASTER.some((p) => p.key === k));
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((k) => PARAM_MASTER.some((p) => p.key === k));
      }
    } catch (e) {
      // ignore parse error
    }
    return [];
  }

  /* ----------------------------------------------------
     Offers list for dropdown
  ---------------------------------------------------- */
  const loadOffers = async (search = "") => {
    setOffersLoading(true);
    try {
      const res = await apiClient.get(
        `/distribution/offers?search=${encodeURIComponent(search)}`
      );
      setOffers(res.data?.items || []);
    } catch (err) {
      console.error("Load offers error:", err);
    } finally {
      setOffersLoading(false);
    }
  };

  // initial offers load
  useEffect(() => {
    loadOffers("");
  }, []);

  // search offers when offerSearch changes (simple)
  useEffect(() => {
    const t = setTimeout(() => {
      loadOffers(offerSearch);
    }, 400);
    return () => clearTimeout(t);
  }, [offerSearch]);

  /* ----------------------------------------------------
     Rule modal open / close / submit
  ---------------------------------------------------- */
  const openAddRuleModal = () => {
    if (!selectedLink) {
      alert("Select a tracking link first");
      return;
    }

    setIsEditing(false);
    setCurrentRuleId(null);
    setRuleError("");

    setRuleForm({
      offer_id: "",
      geo: selectedLink.geo || "ALL",
      carrier: selectedLink.carrier || "ALL",
      device: "ALL",
      priority: 1,
      weight: 100,
      is_fallback: false,
    });

    setShowRuleModal(true);
  };

  const openEditRuleModal = (rule) => {
    setIsEditing(true);
    setCurrentRuleId(rule.id);
    setRuleError("");

    setRuleForm({
      offer_id: rule.offer_id,
      geo: rule.geo || "ALL",
      carrier: rule.carrier || "ALL",
      device: rule.device || "ALL",
      priority: rule.priority || 1,
      weight: rule.weight ?? 0,
      is_fallback: !!rule.is_fallback,
    });

    setShowRuleModal(true);
  };

  const closeRuleModal = () => {
    setShowRuleModal(false);
  };

  const handleRuleFormChange = (field, value) => {
    setRuleForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateRuleForm = () => {
    const { offer_id, priority, weight } = ruleForm;
    if (!offer_id) return "Select an offer";
    if (!selectedLink) return "Select a tracking link";
    const p = Number(priority);
    const w = Number(weight);
    if (!Number.isFinite(p) || p <= 0) return "Priority must be >= 1";
    if (!Number.isFinite(w) || w < 0 || w > 100)
      return "Weight must be between 0 and 100";
    return "";
  };

  const submitRuleForm = async () => {
    const validationMsg = validateRuleForm();
    if (validationMsg) {
      setRuleError(validationMsg);
      return;
    }

    if (!selectedLink) return;

    const payload = {
      pub_code: pubCode || selectedLink.pub_code,
      tracking_link_id: selectedLink.id,
      offer_id: ruleForm.offer_id,
      geo: ruleForm.geo || "ALL",
      carrier: ruleForm.carrier || "ALL",
      device: ruleForm.device || "ALL",
      priority: Number(ruleForm.priority) || 1,
      weight: Number(ruleForm.weight) || 0,
      is_fallback: !!ruleForm.is_fallback,
    };

    try {
      if (isEditing && currentRuleId) {
        await apiClient.put(`/distribution/rules/${currentRuleId}`, payload);
      } else {
        await apiClient.post(`/distribution/rules`, payload);
      }
      await loadRules(selectedLink);
      setShowRuleModal(false);
    } catch (err) {
      console.error("Save rule error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save rule";
      setRuleError(msg);
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm(`Delete rule for offer ${rule.offer_id}?`)) return;
    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      await loadRules(selectedLink);
    } catch (err) {
      console.error("Delete rule error:", err);
      alert("Failed to delete rule");
    }
  };

  /* ----------------------------------------------------
     Rules search + pagination
  ---------------------------------------------------- */
  const filteredRules = useMemo(() => {
    if (!rulesSearch.trim()) return rules;
    const q = rulesSearch.toLowerCase();
    return rules.filter((r) => {
      return (
        (r.offer_id || "").toLowerCase().includes(q) ||
        (r.offer_name || "").toLowerCase().includes(q) ||
        (r.advertiser_name || "").toLowerCase().includes(q) ||
        (r.geo || "").toLowerCase().includes(q) ||
        (r.carrier || "").toLowerCase().includes(q)
      );
    });
  }, [rules, rulesSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / PAGE_SIZE));
  const currentPage = Math.min(rulesPage, totalPages);
  const pagedRules = filteredRules.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    // reset to page 1 when search changes
    setRulesPage(1);
  }, [rulesSearch]);

  /* ----------------------------------------------------
     Parameter selection & URL build + copy
  ---------------------------------------------------- */
  const toggleParam = (key) => {
    setSelectedParams((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const buildPreviewUrl = () => {
    if (!selectedLink) return "";

    const params = new URLSearchParams();

    // pub_id == pub_code (PUB03, PUB04...)
    params.set("pub_id", pubCode || selectedLink.pub_code || "");

    // geo + carrier from selected link
    if (selectedLink.geo) params.set("geo", selectedLink.geo);
    if (selectedLink.carrier) params.set("carrier", selectedLink.carrier);

    // also pass tracking_link_id (helpful for resolve)
    params.set("tracking_link_id", String(selectedLink.id));

    // selected dynamic parameters: {click_id}, {ip}, ...
    selectedParams.forEach((key) => {
      params.set(key, `{${key}}`);
    });

    return `${BACKEND_CLICK_BASE}?${params.toString()}`;
  };

  const previewUrl = buildPreviewUrl();

  const copyUrl = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
      setCopyStatus("Copy failed");
      setTimeout(() => setCopyStatus(""), 1500);
    }
  };

  /* ----------------------------------------------------
     Right panel resize logic
  ---------------------------------------------------- */
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const container = document.getElementById("td-layout-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentRight = ((rect.width - x) / rect.width) * 100;
      const clamped = Math.min(80, Math.max(30, percentRight));
      setRightWidth(clamped);
    };

    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const leftWidth = 100 - rightWidth;

  /* ----------------------------------------------------
     Derived summary data
  ---------------------------------------------------- */
  const firstRule = rules[0];
  const advertiserNameHeader =
    firstRule?.advertiser_name || selectedLink?.advertiser_name || "-";

  const totalWeight = rules.reduce(
    (sum, r) => sum + (Number(r.weight) || 0),
    0
  );

  /* ----------------------------------------------------
     RENDER
  ---------------------------------------------------- */

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution</h1>

      {/* Top: PUB code input */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="PUB03"
          className="border rounded px-3 py-2 w-40"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.trim())}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          onClick={loadLinks}
          disabled={linksLoading}
        >
          {linksLoading ? "Loading..." : "Load Links"}
        </button>

        {selectedLink && (
          <div className="text-sm text-gray-600 flex flex-wrap gap-4 ml-auto">
            <span>
              <strong>Publisher:</strong> {selectedLink.publisher_name || "-"}
            </span>
            <span>
              <strong>Advertiser:</strong> {advertiserNameHeader}
            </span>
            <span>
              <strong>Total Weight:</strong> {totalWeight}%
            </span>
          </div>
        )}
      </div>

      {/* Main layout: left list + resizable right panel */}
      <div
        id="td-layout-container"
        className="flex border rounded overflow-hidden h-[520px]"
      >
        {/* LEFT: Tracking Links */}
        <div
          className="border-r overflow-y-auto"
          style={{ width: `${leftWidth}%`, minWidth: "220px" }}
        >
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Tracking Links</h3>
            <span className="text-xs text-gray-500">
              {links.length} link(s)
            </span>
          </div>

          {links.length === 0 && !linksLoading && (
            <p className="p-4 text-sm text-gray-500">
              No tracking links. Enter PUB code and click &quot;Load Links&quot;.
            </p>
          )}

          {linksLoading && (
            <p className="p-4 text-sm text-gray-500">Loading links...</p>
          )}

          <div className="p-3 space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className={`p-3 border rounded cursor-pointer text-sm transition ${
                  selectedLink?.id === link.id
                    ? "bg-blue-50 border-blue-400"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => handleSelectLink(link)}
              >
                <div className="font-semibold text-gray-800">
                  {link.name}{" "}
                  <span className="text-xs text-gray-500">
                    ({link.pub_code})
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  GEO: <strong>{link.geo || "-"}</strong> · Carrier:{" "}
                  <strong>{link.carrier || "-"}</strong> · Type:{" "}
                  <strong>{link.type || "-"}</strong>
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {link.tracking_url}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider for resizing */}
        <div
          className="w-1 cursor-col-resize bg-gray-200 hover:bg-gray-300"
          onMouseDown={() => setIsResizing(true)}
        />

        {/* RIGHT: Rules + Parameters + URL */}
        <div
          className="flex-1 overflow-hidden flex flex-col"
          style={{ width: `${rightWidth}%` }}
        >
          {/* Top summary + parameters + URL preview */}
          <div className="border-b p-4 space-y-3 bg-gray-50">
            {selectedLink ? (
              <>
                <div className="flex flex-wrap gap-4 text-xs text-gray-700">
                  <span>
                    <strong>Link:</strong> {selectedLink.name} (ID:{" "}
                    {selectedLink.id})
                  </span>
                  <span>
                    <strong>GEO:</strong> {selectedLink.geo || "-"}
                  </span>
                  <span>
                    <strong>Carrier:</strong> {selectedLink.carrier || "-"}
                  </span>
                  <span>
                    <strong>Type:</strong> {selectedLink.type || "-"}
                  </span>
                  <span>
                    <strong>Daily Cap:</strong>{" "}
                    {selectedLink.cap_daily ?? "0"}
                  </span>
                  <span>
                    <strong>Total Cap:</strong>{" "}
                    {selectedLink.cap_total ?? "0"}
                  </span>
                </div>

                {/* Parameters selection */}
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    Default Parameters (attach to URL)
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {PARAM_MASTER.map((p) => (
                      <label key={p.key} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={selectedParams.includes(p.key)}
                          onChange={() => toggleParam(p.key)}
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Final Tracking URL preview + copy */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                      Final Tracking URL (share with publisher)
                    </span>
                    {copyStatus && (
                      <span className="text-[11px] text-green-600">
                        {copyStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border rounded px-2 py-1 text-xs"
                      readOnly
                      value={previewUrl}
                    />
                    <button
                      className="px-3 py-1 text-xs bg-gray-800 text-white rounded"
                      onClick={copyUrl}
                      disabled={!previewUrl}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Select a tracking link to see rules &amp; URL.
              </p>
            )}
          </div>

          {/* Rules list */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center mb-3 gap-3">
              <h3 className="font-semibold text-sm">Rules</h3>
              <button
                className="ml-auto bg-blue-600 text-white text-xs px-3 py-1.5 rounded disabled:opacity-60"
                onClick={openAddRuleModal}
                disabled={!selectedLink}
              >
                + Add Rule
              </button>
            </div>

            {rulesLoading && (
              <p className="text-sm text-gray-500 mb-2">Loading rules...</p>
            )}

            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                placeholder="Search rule (offer, advertiser, geo, carrier)"
                className="border rounded px-2 py-1 text-xs w-64"
                value={rulesSearch}
                onChange={(e) => setRulesSearch(e.target.value)}
              />
              <span className="text-[11px] text-gray-500">
                {filteredRules.length} rule(s)
              </span>
            </div>

            {filteredRules.length === 0 && !rulesLoading && (
              <p className="text-sm text-gray-500">
                No rules. Click &quot;Add Rule&quot; to create one.
              </p>
            )}

            {filteredRules.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-2 py-1 text-left">Offer ID</th>
                        <th className="px-2 py-1 text-left">Offer Name</th>
                        <th className="px-2 py-1 text-left">Advertiser</th>
                        <th className="px-2 py-1 text-left">Type</th>
                        <th className="px-2 py-1 text-left">Geo</th>
                        <th className="px-2 py-1 text-left">Carrier</th>
                        <th className="px-2 py-1 text-left">Device</th>
                        <th className="px-2 py-1 text-right">Priority</th>
                        <th className="px-2 py-1 text-right">Weight</th>
                        <th className="px-2 py-1 text-center">Fallback</th>
                        <th className="px-2 py-1 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRules.map((r) => (
                        <tr key={r.id} className="border-b">
                          <td className="px-2 py-1">{r.offer_id}</td>
                          <td className="px-2 py-1">{r.offer_name}</td>
                          <td className="px-2 py-1">
                            {r.advertiser_name || "-"}
                          </td>
                          <td className="px-2 py-1">{r.offer_type || "-"}</td>
                          <td className="px-2 py-1">{r.geo}</td>
                          <td className="px-2 py-1">{r.carrier}</td>
                          <td className="px-2 py-1">{r.device}</td>
                          <td className="px-2 py-1 text-right">
                            {r.priority}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {r.weight}%
                          </td>
                          <td className="px-2 py-1 text-center">
                            {r.is_fallback ? "YES" : ""}
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button
                              className="text-[11px] text-blue-600 mr-2"
                              onClick={() => openEditRuleModal(r)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-[11px] text-red-600"
                              onClick={() => deleteRule(r)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 border rounded disabled:opacity-40"
                      disabled={currentPage <= 1}
                      onClick={() => setRulesPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <button
                      className="px-2 py-1 border rounded disabled:opacity-40"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setRulesPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">
                {isEditing ? "Edit Rule" : "Add Rule"}
              </h2>
              <button
                className="text-gray-500 text-lg leading-none"
                onClick={closeRuleModal}
              >
                ×
              </button>
            </div>

            {selectedLink && (
              <div className="text-[11px] text-gray-500 mb-2">
                Link: <strong>{selectedLink.name}</strong> (ID:
                {selectedLink.id}) · PUB:{" "}
                <strong>{pubCode || selectedLink.pub_code}</strong>
              </div>
            )}

            {ruleError && (
              <div className="mb-2 text-xs text-red-600">{ruleError}</div>
            )}

            <div className="space-y-3 text-xs">
              {/* Offer dropdown + search */}
              <div>
                <label className="block mb-1 font-medium">Offer</label>
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    placeholder="Search offers"
                    className="border rounded px-2 py-1 flex-1"
                    value={offerSearch}
                    onChange={(e) => setOfferSearch(e.target.value)}
                  />
                  {offersLoading && (
                    <span className="text-[11px] text-gray-500 self-center">
                      Loading...
                    </span>
                  )}
                </div>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={ruleForm.offer_id}
                  onChange={(e) =>
                    handleRuleFormChange("offer_id", e.target.value)
                  }
                >
                  <option value="">Select offer</option>
                  {offers.map((o) => (
                    <option key={o.offer_id} value={o.offer_id}>
                      {o.offer_id} — {o.name} ({o.advertiser_name}) [{o.type}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Targeting */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block mb-1 font-medium">Geo</label>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full"
                    value={ruleForm.geo}
                    onChange={(e) =>
                      handleRuleFormChange("geo", e.target.value.toUpperCase())
                    }
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Carrier</label>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full"
                    value={ruleForm.carrier}
                    onChange={(e) =>
                      handleRuleFormChange(
                        "carrier",
                        e.target.value.trim() || "ALL"
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Device</label>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full"
                    placeholder="ALL / ANDROID / IOS / DESKTOP"
                    value={ruleForm.device}
                    onChange={(e) =>
                      handleRuleFormChange(
                        "device",
                        e.target.value.toUpperCase()
                      )
                    }
                  />
                </div>
              </div>

              {/* Priority / Weight / Fallback */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block mb-1 font-medium">Priority</label>
                  <input
                    type="number"
                    min={1}
                    className="border rounded px-2 py-1 w-full"
                    value={ruleForm.priority}
                    onChange={(e) =>
                      handleRuleFormChange("priority", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">
                    Weight (% of traffic)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="border rounded px-2 py-1 w-full"
                    value={ruleForm.weight}
                    onChange={(e) =>
                      handleRuleFormChange("weight", e.target.value)
                    }
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={ruleForm.is_fallback}
                      onChange={(e) =>
                        handleRuleFormChange("is_fallback", e.target.checked)
                      }
                    />
                    <span className="font-medium">Fallback</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                className="px-3 py-1 border rounded"
                onClick={closeRuleModal}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 bg-blue-600 text-white rounded"
                onClick={submitRuleForm}
              >
                {isEditing ? "Save Changes" : "Add Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
