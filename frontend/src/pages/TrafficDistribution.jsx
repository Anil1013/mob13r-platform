// File: frontend/src/pages/TrafficDistribution.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import apiClient from "../api/apiClient";

const CLICK_BASE_URL = "https://backend.mob13r.com/click";

const PARAM_KEYS = [
  "ip",
  "ua",
  "device",
  "msisdn",
  "click_id",
  "sub1",
  "sub2",
  "sub3",
  "sub4",
  "sub5",
];

const DEFAULT_PARAMS = {
  ip: true,
  ua: true,
  device: false,
  msisdn: false,
  click_id: false,
  sub1: false,
  sub2: false,
  sub3: false,
  sub4: false,
  sub5: false,
};

const PAGE_SIZE = 10;

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [links, setLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [rules, setRules] = useState([]);
  const [ruleSearch, setRuleSearch] = useState("");
  const [page, setPage] = useState(1);

  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);

  const [paramsState, setParamsState] = useState(DEFAULT_PARAMS);
  const [isSavingParams, setIsSavingParams] = useState(false);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const [offers, setOffers] = useState([]);
  const [offerSearch, setOfferSearch] = useState("");
  const offerSearchTimeout = useRef(null);

  const wrapperRef = useRef(null);
  const [rulesPanelWidth, setRulesPanelWidth] = useState(520);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  /* ------------------------------------------------------------------
     Load tracking links by PUB code
  ------------------------------------------------------------------ */
  const loadLinks = async () => {
    const trimmed = pubCode.trim();
    if (!trimmed) return alert("Enter PUB code (e.g. PUB03)");

    setIsLoadingLinks(true);
    setSelectedLink(null);
    setRules([]);
    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_code=${encodeURIComponent(trimmed)}`
      );
      const items = res.data?.items || [];
      setLinks(items);
      if (!items.length) {
        alert("No tracking links found for this PUB.");
      }
    } catch (err) {
      console.error("Fetch tracking links error:", err);
      alert("Failed to load tracking links (check console).");
    } finally {
      setIsLoadingLinks(false);
    }
  };

  /* ------------------------------------------------------------------
     Load rules for a selected tracking link
  ------------------------------------------------------------------ */
  const loadRules = async (link) => {
    setSelectedLink(link);
    setRules([]);
    setPage(1);

    // default params from link.required_params
    const rp = link.required_params || {};
    setParamsState({
      ...DEFAULT_PARAMS,
      ...rp,
    });

    if (!link) return;

    setIsLoadingRules(true);
    try {
      const res = await apiClient.get(
        `/distribution/rules?tracking_link_id=${link.id}`
      );
      setRules(res.data?.items || []);
    } catch (err) {
      console.error("Fetch rules error:", err);
      alert("Failed to load rules (check console).");
    } finally {
      setIsLoadingRules(false);
    }
  };

  /* ------------------------------------------------------------------
     Save default parameters for selected link
  ------------------------------------------------------------------ */
  const handleToggleParam = (key) => {
    setParamsState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveParams = async () => {
    if (!selectedLink) return;
    setIsSavingParams(true);
    try {
      await apiClient.put(
        `/distribution/tracking-links/${selectedLink.id}/params`,
        { required_params: paramsState }
      );
      alert("Default parameters saved.");
    } catch (err) {
      console.error("Save params error:", err);
      alert("Failed to save parameters.");
    } finally {
      setIsSavingParams(false);
    }
  };

  /* ------------------------------------------------------------------
     Build preview publisher URL for current link + params
  ------------------------------------------------------------------ */
  const previewUrl = useMemo(() => {
    if (!selectedLink) return "";
    const base = `${CLICK_BASE_URL}?pub_id=${encodeURIComponent(
      selectedLink.pub_code
    )}&geo=${encodeURIComponent(selectedLink.geo)}&carrier=${encodeURIComponent(
      selectedLink.carrier
    )}`;

    const parts = [];
    PARAM_KEYS.forEach((key) => {
      if (paramsState[key]) {
        parts.push(`${key}={${key}}`);
      }
    });

    if (!parts.length) return base;
    return `${base}&${parts.join("&")}`;
  }, [selectedLink, paramsState]);

  const copyPreviewUrl = () => {
    if (!previewUrl) return;
    navigator.clipboard
      .writeText(previewUrl)
      .then(() => alert("Tracking URL copied."))
      .catch(() =>
        alert("Unable to copy URL (clipboard permission issue).")
      );
  };

  /* ------------------------------------------------------------------
     Filter + paginate rules
  ------------------------------------------------------------------ */
  const filteredRules = useMemo(() => {
    if (!ruleSearch.trim()) return rules;
    const s = ruleSearch.toLowerCase();
    return rules.filter((r) => {
      return (
        r.offer_id?.toLowerCase().includes(s) ||
        r.offer_name?.toLowerCase().includes(s) ||
        r.advertiser_name?.toLowerCase().includes(s) ||
        r.publisher_name?.toLowerCase().includes(s) ||
        r.geo?.toLowerCase().includes(s) ||
        r.carrier?.toLowerCase().includes(s)
      );
    });
  }, [rules, ruleSearch]);

  const totalWeight = useMemo(
    () => filteredRules.reduce((sum, r) => sum + (r.weight || 0), 0),
    [filteredRules]
  );

  const pagedRules = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRules.slice(start, start + PAGE_SIZE);
  }, [filteredRules, page]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / PAGE_SIZE));

  /* ------------------------------------------------------------------
     Offers for Add/Edit modal
  ------------------------------------------------------------------ */
  const fetchOffers = async (search = "") => {
    try {
      const res = await apiClient.get(
        `/distribution/offers?search=${encodeURIComponent(search)}`
      );
      setOffers(res.data?.items || []);
    } catch (err) {
      console.error("Fetch offers error:", err);
    }
  };

  useEffect(() => {
    if (!showRuleModal) return;
    fetchOffers(offerSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRuleModal]);

  const handleOfferSearchChange = (e) => {
    const value = e.target.value;
    setOfferSearch(value);

    if (offerSearchTimeout.current) {
      clearTimeout(offerSearchTimeout.current);
    }
    offerSearchTimeout.current = setTimeout(
      () => fetchOffers(value),
      300
    );
  };

  /* ------------------------------------------------------------------
     Add/Edit Rule modal helpers
  ------------------------------------------------------------------ */
  const emptyRuleForm = {
    offer_id: "",
    geo: "ALL",
    carrier: "ALL",
    device: "ALL",
    priority: 1,
    weight: 100,
    is_fallback: false,
  };

  const [ruleForm, setRuleForm] = useState(emptyRuleForm);

  const openAddRule = () => {
    if (!selectedLink) {
      return alert("Select a tracking link first.");
    }
    setEditingRule(null);
    setRuleForm({
      ...emptyRuleForm,
    });
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      offer_id: rule.offer_id,
      geo: rule.geo,
      carrier: rule.carrier,
      device: rule.device || "ALL",
      priority: rule.priority,
      weight: rule.weight,
      is_fallback: rule.is_fallback,
    });
    setShowRuleModal(true);
  };

  const closeRuleModal = () => {
    setShowRuleModal(false);
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
  };

  const handleRuleFormChange = (field, value) => {
    setRuleForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveRule = async () => {
    if (!selectedLink) return;
    if (!ruleForm.offer_id) {
      return alert("Select an offer.");
    }

    setModalSaving(true);
    try {
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

      if (editingRule) {
        await apiClient.put(
          `/distribution/rules/${editingRule.id}`,
          payload
        );
      } else {
        await apiClient.post("/distribution/rules", payload);
      }

      await loadRules(selectedLink);
      closeRuleModal();
    } catch (err) {
      console.error("Add/Edit rule error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save rule.";
      alert(msg);
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteRule = async (rule) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      await loadRules(selectedLink);
    } catch (err) {
      console.error("Delete rule error:", err);
      alert("Failed to delete rule.");
    }
  };

  /* ------------------------------------------------------------------
     Resizable right panel
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isDraggingDivider) return;

    const onMove = (e) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const rightWidth = rect.right - e.clientX;
      const minRight = 420;
      const maxRight = rect.width - 320;
      const clamped = Math.min(Math.max(rightWidth, minRight), maxRight);
      setRulesPanelWidth(clamped);
    };

    const onUp = () => setIsDraggingDivider(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDraggingDivider]);

  /* ------------------------------------------------------------------
     Render
  ------------------------------------------------------------------ */

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution</h1>

      {/* PUB + Load + Copy URL */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="PUB03"
          className="border rounded px-3 py-2 min-w-[160px]"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value)}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          onClick={loadLinks}
          disabled={isLoadingLinks}
        >
          {isLoadingLinks ? "Loading..." : "Load Links"}
        </button>

        {selectedLink && (
          <button
            className="border px-4 py-2 rounded"
            onClick={copyPreviewUrl}
          >
            Copy Tracking URL
          </button>
        )}
      </div>

      {/* Main columns with draggable divider */}
      <div
        ref={wrapperRef}
        className="flex border rounded-lg overflow-hidden bg-white"
        style={{ minHeight: "420px" }}
      >
        {/* LEFT: Tracking links */}
        <div className="flex-1 min-w-[260px] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Tracking Links</h3>
            <span className="text-xs text-gray-500">
              {links.length ? `${links.length} link(s)` : ""}
            </span>
          </div>

          {links.length === 0 && !isLoadingLinks && (
            <p className="text-sm text-gray-500">
              No tracking links. Enter PUB code and click &quot;Load
              Links&quot;.
            </p>
          )}

          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                onClick={() => loadRules(link)}
                className={`p-3 border rounded cursor-pointer text-sm ${
                  selectedLink?.id === link.id
                    ? "bg-blue-50 border-blue-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="font-semibold">
                  {link.name} ({link.pub_code})
                </div>
                <div className="text-xs text-gray-600">
                  {link.geo} • {link.carrier} • {link.type} • Cap{" "}
                  {link.cap_daily}/{link.cap_total}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-1 bg-gray-200 cursor-col-resize"
          onMouseDown={() => setIsDraggingDivider(true)}
        />

        {/* RIGHT: Rules panel */}
        <div
          className="border-l bg-gray-50 p-4 flex flex-col"
          style={{ width: rulesPanelWidth, minWidth: 420 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold">Rules</h3>
              <p className="text-xs text-gray-500">
                {selectedLink
                  ? `${selectedLink.name} (${selectedLink.pub_code})`
                  : "Select a tracking link to see rules & URL."}
              </p>
            </div>

            <button
              className="bg-green-600 text-white px-4 py-1.5 rounded text-sm disabled:opacity-60"
              onClick={openAddRule}
              disabled={!selectedLink}
            >
              + Add Rule
            </button>
          </div>

          {/* Default Parameters + preview */}
          {selectedLink && (
            <div className="mb-4 border rounded bg-white px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">
                  Default Parameters (required_params)
                </span>
                <button
                  className="text-xs px-3 py-1 rounded bg-gray-800 text-white disabled:opacity-60"
                  onClick={handleSaveParams}
                  disabled={isSavingParams}
                >
                  {isSavingParams ? "Saving..." : "Save Params"}
                </button>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2">
                {PARAM_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!paramsState[key]}
                      onChange={() => handleToggleParam(key)}
                    />
                    <span className="capitalize">
                      {key === "click_id" ? "Click ID" : key}
                    </span>
                  </label>
                ))}
              </div>

              <div className="text-[11px] text-gray-600 truncate">
                <span className="font-semibold mr-1">Preview:</span>
                {previewUrl}
              </div>
            </div>
          )}

          {/* Search + total weight */}
          <div className="flex items-center justify-between mb-2">
            <input
              type="text"
              placeholder="Search rule (offer, advertiser, geo, ...)"
              className="flex-1 border rounded px-2 py-1 text-sm mr-3"
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
            />
            <div className="text-xs text-gray-600">
              Total Weight:{" "}
              <span className={totalWeight === 100 ? "text-green-600" : "text-red-600"}>
                {totalWeight}
              </span>{" "}
              / 100
            </div>
          </div>

          {/* Rules table */}
          <div className="flex-1 overflow-auto border rounded bg-white">
            {!selectedLink && (
              <div className="p-4 text-sm text-gray-500">
                No rules. Select a tracking link first.
              </div>
            )}

            {selectedLink && isLoadingRules && (
              <div className="p-4 text-sm text-gray-500">Loading rules...</div>
            )}

            {selectedLink && !isLoadingRules && filteredRules.length === 0 && (
              <div className="p-4 text-sm text-gray-500">
                No rules. Click &quot;Add Rule&quot; to create one.
              </div>
            )}

            {selectedLink && filteredRules.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100 border-b text-[11px]">
                    <tr>
                      <th className="px-2 py-1 text-left">PUB</th>
                      <th className="px-2 py-1 text-left">Offer</th>
                      <th className="px-2 py-1 text-left">Advertiser</th>
                      <th className="px-2 py-1 text-left">Publisher</th>
                      <th className="px-2 py-1 text-left">Geo</th>
                      <th className="px-2 py-1 text-left">Carrier</th>
                      <th className="px-2 py-1 text-left">Type</th>
                      <th className="px-2 py-1 text-left">Device</th>
                      <th className="px-2 py-1 text-left">Priority</th>
                      <th className="px-2 py-1 text-left">Weight</th>
                      <th className="px-2 py-1 text-left">Fallback</th>
                      <th className="px-2 py-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRules.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-1">{r.pub_code}</td>
                        <td className="px-2 py-1">
                          <div className="font-semibold">{r.offer_id}</div>
                          <div className="text-[10px] text-gray-500">
                            {r.offer_name}
                          </div>
                        </td>
                        <td className="px-2 py-1">{r.advertiser_name}</td>
                        <td className="px-2 py-1">{r.publisher_name}</td>
                        <td className="px-2 py-1">{r.geo}</td>
                        <td className="px-2 py-1">{r.carrier}</td>
                        <td className="px-2 py-1">{r.offer_type}</td>
                        <td className="px-2 py-1">{r.device || "ALL"}</td>
                        <td className="px-2 py-1">{r.priority}</td>
                        <td className="px-2 py-1">{r.weight}</td>
                        <td className="px-2 py-1">
                          {r.is_fallback ? "YES" : "NO"}
                        </td>
                        <td className="px-2 py-1">
                          <button
                            className="text-blue-600 mr-2"
                            onClick={() => openEditRule(r)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600"
                            onClick={() => handleDeleteRule(r)}
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
          </div>

          {/* Pagination */}
          {selectedLink && filteredRules.length > 0 && (
            <div className="flex items-center justify-between mt-2 text-xs">
              <div>
                Showing{" "}
                {filteredRules.length
                  ? (page - 1) * PAGE_SIZE + 1
                  : 0}{" "}
                –{" "}
                {Math.min(page * PAGE_SIZE, filteredRules.length)} of{" "}
                {filteredRules.length}
              </div>
              <div className="space-x-1">
                <button
                  className="px-2 py-1 border rounded disabled:opacity-40"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span>
                  Page {page} / {totalPages}
                </span>
                <button
                  className="px-2 py-1 border rounded disabled:opacity-40"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-5">
            <h2 className="text-lg font-semibold mb-4">
              {editingRule ? "Edit Rule" : "Add Rule"}
            </h2>

            {/* Offer */}
            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">
                Offer
              </label>
              <input
                type="text"
                placeholder="Search offer..."
                className="border rounded px-2 py-1 text-sm w-full mb-1"
                value={offerSearch}
                onChange={handleOfferSearchChange}
              />
              <select
                className="border rounded px-2 py-1 text-sm w-full"
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

            {/* Geo / Carrier / Device */}
            <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Geo
                </label>
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
                <label className="block text-xs font-semibold mb-1">
                  Carrier
                </label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-full"
                  value={ruleForm.carrier}
                  onChange={(e) =>
                    handleRuleFormChange(
                      "carrier",
                      e.target.value.toUpperCase()
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Device
                </label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-full"
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

            {/* Priority / Weight */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-full"
                  value={ruleForm.priority}
                  onChange={(e) =>
                    handleRuleFormChange("priority", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Weight
                </label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-full"
                  value={ruleForm.weight}
                  onChange={(e) =>
                    handleRuleFormChange("weight", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Fallback */}
            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="checkbox"
                checked={ruleForm.is_fallback}
                onChange={(e) =>
                  handleRuleFormChange("is_fallback", e.target.checked)
                }
              />
              <span>Fallback Rule</span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={closeRuleModal}
                disabled={modalSaving}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                onClick={handleSaveRule}
                disabled={modalSaving}
              >
                {modalSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
