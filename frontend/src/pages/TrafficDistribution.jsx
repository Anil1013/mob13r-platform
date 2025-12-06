import React, { useMemo, useState } from "react";
import apiClient from "../api/apiClient";

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

const PARAM_LABELS = {
  ip: "IP",
  ua: "UA",
  device: "Device",
  msisdn: "MSISDN",
  click_id: "Click ID",
  sub1: "sub1",
  sub2: "sub2",
  sub3: "sub3",
  sub4: "sub4",
  sub5: "sub5",
};

const emptyFlags = PARAM_KEYS.reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {});

function flagsFromJson(jsonValue) {
  // jsonValue expected like: { ip: true, ua: false, ... }
  const flags = { ...emptyFlags };

  if (jsonValue && typeof jsonValue === "object") {
    for (const key of PARAM_KEYS) {
      if (Object.prototype.hasOwnProperty.call(jsonValue, key)) {
        flags[key] = !!jsonValue[key];
      }
    }
  }

  return flags;
}

function arrayFromFlags(flags) {
  return PARAM_KEYS.filter((key) => flags[key]);
}

function buildUrlWithParams(baseUrl, flags) {
  if (!baseUrl) return "";

  const params = arrayFromFlags(flags);
  if (!params.length) return baseUrl;

  const hasQuery = baseUrl.includes("?");
  let url = baseUrl;

  for (const key of params) {
    url += (hasQuery ? "&" : "?") + `${key}={${key}}`;
    // after first param, we always have query part
    if (!hasQuery) {
      // first time we add '?'
      // for next params, we want '&'
      baseUrl += "";
    }
  }

  return url;
}

function initialRuleForm(selectedLink) {
  return {
    offer_id: "",
    geo: selectedLink?.geo && selectedLink.geo !== "ALL" ? selectedLink.geo : "ALL",
    carrier:
      selectedLink?.carrier && selectedLink.carrier !== "ALL"
        ? selectedLink.carrier
        : "ALL",
    device: "ALL",
    priority: 1,
    weight: 0,
    is_fallback: false,
  };
}

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");

  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const [selectedLink, setSelectedLink] = useState(null);

  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  const [ruleSearch, setRuleSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  const [paramFlags, setParamFlags] = useState({ ...emptyFlags });
  const [savingParams, setSavingParams] = useState(false);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState(initialRuleForm());

  const [savingRule, setSavingRule] = useState(false);

  /* ---------------------------
      LOAD TRACKING LINKS
  --------------------------- */
  const loadLinks = async () => {
    const code = pubCode.trim();
    if (!code) {
      alert("Enter PUB Code (e.g. PUB03)");
      return;
    }

    setLinksLoading(true);
    setSelectedLink(null);
    setRules([]);
    setPage(1);

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_code=${encodeURIComponent(code)}`
      );
      const items = res.data?.items || [];
      setLinks(items);

      if (!items.length) {
        alert("No tracking links found for this PUB code.");
      }
    } catch (err) {
      console.error("Fetch tracking links error:", err);
      alert("Failed to fetch tracking links.");
    } finally {
      setLinksLoading(false);
    }
  };

  /* ---------------------------
      LOAD RULES
  --------------------------- */
  const loadRules = async (link) => {
    if (!link) return;

    setSelectedLink(link);
    setRules([]);
    setPage(1);

    // load default parameter flags from tracking link
    const flags = flagsFromJson(link.required_params || {});
    setParamFlags(flags);

    setRulesLoading(true);
    try {
      const res = await apiClient.get(
        `/distribution/rules?tracking_link_id=${link.id}`
      );
      const items = res.data?.items || [];
      setRules(items);
    } catch (err) {
      console.error("Fetch rules error:", err);
      alert("Failed to fetch rules.");
    } finally {
      setRulesLoading(false);
    }
  };

  /* ---------------------------
      SAVE DEFAULT PARAMETERS
  --------------------------- */
  const handleSaveParams = async () => {
    if (!selectedLink) return;

    setSavingParams(true);
    try {
      await apiClient.put(
        `/distribution/tracking-links/${selectedLink.id}/params`,
        {
          required_params: paramFlags,
        }
      );

      // update copy inside links + selectedLink
      setLinks((prev) =>
        prev.map((l) =>
          l.id === selectedLink.id ? { ...l, required_params: { ...paramFlags } } : l
        )
      );
      setSelectedLink((prev) =>
        prev ? { ...prev, required_params: { ...paramFlags } } : prev
      );

      alert("Default parameters saved.");
    } catch (err) {
      console.error("Save params error:", err);
      alert("Failed to save parameters.");
    } finally {
      setSavingParams(false);
    }
  };

  /* ---------------------------
      COPY TRACKING URL
  --------------------------- */
  const trackingUrlWithParams = useMemo(() => {
    if (!selectedLink) return "";
    return buildUrlWithParams(selectedLink.tracking_url, paramFlags);
  }, [selectedLink, paramFlags]);

  const handleCopyUrl = async () => {
    if (!trackingUrlWithParams) {
      alert("No tracking link selected.");
      return;
    }

    try {
      await navigator.clipboard.writeText(trackingUrlWithParams);
      alert("Tracking URL copied!");
    } catch (err) {
      console.error("Clipboard error:", err);
      // Fallback
      window.prompt("Copy URL:", trackingUrlWithParams);
    }
  };

  /* ---------------------------
      OFFERS (for dropdown)
  --------------------------- */
  const loadOffers = async (search = "") => {
    setOffersLoading(true);
    try {
      const res = await apiClient.get(
        `/distribution/offers?search=${encodeURIComponent(search.trim())}`
      );
      const items = res.data?.items || [];
      setOffers(items);
    } catch (err) {
      console.error("Fetch offers error:", err);
      alert("Failed to fetch offers.");
    } finally {
      setOffersLoading(false);
    }
  };

  /* ---------------------------
      RULE TABLE HELPERS
  --------------------------- */
  const totalWeight = useMemo(
    () =>
      rules.reduce(
        (sum, r) => sum + (!r.is_fallback ? Number(r.weight || 0) : 0),
        0
      ),
    [rules]
  );

  const filteredRules = useMemo(() => {
    const term = ruleSearch.trim().toLowerCase();
    if (!term) return rules;

    return rules.filter((r) => {
      const values = [
        r.offer_id,
        r.offer_name,
        r.offer_type,
        r.geo,
        r.carrier,
        r.device,
        r.advertiser_name,
      ];
      return values.some(
        (v) => v && String(v).toLowerCase().includes(term)
      );
    });
  }, [rules, ruleSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRules.length / pageSize)
  );
  const pageSafe = Math.min(page, totalPages);
  const startIdx = (pageSafe - 1) * pageSize;
  const pageRules = filteredRules.slice(startIdx, startIdx + pageSize);

  /* ---------------------------
      RULE MODAL OPEN
  --------------------------- */
  const openAddRule = async () => {
    if (!selectedLink) {
      alert("Select a tracking link first.");
      return;
    }
    setEditingRule(null);
    setRuleForm(initialRuleForm(selectedLink));
    setIsRuleModalOpen(true);
    await loadOffers("");
  };

  const openEditRule = async (rule) => {
    if (!selectedLink) return;
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
    setIsRuleModalOpen(true);
    await loadOffers(rule.offer_id);
  };

  const closeRuleModal = () => {
    setIsRuleModalOpen(false);
    setEditingRule(null);
    setRuleForm(initialRuleForm(selectedLink));
  };

  const handleRuleFormChange = (field, value) => {
    setRuleForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* ---------------------------
      RULE VALIDATION
  --------------------------- */
  const validateRuleForm = () => {
    if (!ruleForm.offer_id) return "Offer is required.";

    const priority = Number(ruleForm.priority) || 1;
    const weight = ruleForm.is_fallback ? 0 : Number(ruleForm.weight) || 0;

    if (priority < 1) return "Priority must be at least 1.";
    if (!ruleForm.is_fallback && weight <= 0)
      return "Weight must be greater than 0 (for non-fallback rule).";

    // Ensure total weight <= 100 for non-fallback rules
    const otherWeight = rules.reduce((sum, r) => {
      if (r.is_fallback) return sum;
      if (editingRule && r.id === editingRule.id) return sum;
      return sum + Number(r.weight || 0);
    }, 0);

    if (otherWeight + weight > 100) {
      return `Total weight would be ${
        otherWeight + weight
      }%. It must not exceed 100%.`;
    }

    return null;
  };

  /* ---------------------------
      SAVE RULE (ADD / EDIT)
  --------------------------- */
  const handleSaveRule = async () => {
    if (!selectedLink) return;

    const error = validateRuleForm();
    if (error) {
      alert(error);
      return;
    }

    const payload = {
      pub_code: selectedLink.pub_code,
      tracking_link_id: selectedLink.id,
      offer_id: ruleForm.offer_id,
      geo: ruleForm.geo || "ALL",
      carrier: ruleForm.carrier || "ALL",
      device: ruleForm.device || "ALL",
      priority: Number(ruleForm.priority) || 1,
      weight: ruleForm.is_fallback ? 0 : Number(ruleForm.weight) || 0,
      is_fallback: !!ruleForm.is_fallback,
      required_params: arrayFromFlags(paramFlags),
    };

    setSavingRule(true);
    try {
      if (editingRule) {
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }

      // reload rules
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
      setSavingRule(false);
    }
  };

  /* ---------------------------
      DELETE RULE
  --------------------------- */
  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Delete rule for offer ${rule.offer_id}?`)) return;

    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      await loadRules(selectedLink);
    } catch (err) {
      console.error("Delete rule error:", err);
      alert("Failed to delete rule.");
    }
  };

  /* ---------------------------
      RENDER
  --------------------------- */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution</h1>

      {/* PUB Code + Buttons */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="PUB03"
          className="border rounded px-3 py-2 min-w-[160px]"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          onClick={loadLinks}
          disabled={linksLoading}
        >
          {linksLoading ? "Loading..." : "Load Links"}
        </button>

        <button
          className="border px-4 py-2 rounded disabled:opacity-60"
          onClick={handleCopyUrl}
          disabled={!selectedLink}
        >
          Copy Tracking URL
        </button>

        {selectedLink && (
          <div className="text-sm text-gray-600 ml-2">
            <span className="mr-4">
              <strong>Publisher:</strong> {selectedLink.publisher_name}
            </span>
            <span>
              <strong>Link:</strong> {selectedLink.name}
            </span>
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

          {links.length === 0 && (
            <p className="text-sm text-gray-500">No tracking links.</p>
          )}

          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className={`p-2 border rounded cursor-pointer text-sm ${
                  selectedLink?.id === link.id
                    ? "bg-blue-100 border-blue-400"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => loadRules(link)}
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
        </div>

        {/* Rules */}
        <div className="border rounded p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold">Rules</h3>
              {selectedLink && (
                <div className="text-xs text-gray-500">
                  {selectedLink.name} ({selectedLink.pub_code})
                </div>
              )}
              <div className="text-xs text-gray-700 mt-1">
                Total Weight: <strong>{totalWeight}</strong> / 100
              </div>
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
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm disabled:opacity-60"
                onClick={openAddRule}
                disabled={!selectedLink}
              >
                + Add Rule
              </button>
            </div>
          </div>

          {/* Default Parameters */}
          <div className="border rounded px-3 py-2 mb-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">
                Default Parameters (required_params)
              </span>
              <button
                className="bg-gray-800 text-white px-3 py-1 rounded text-xs disabled:opacity-60"
                onClick={handleSaveParams}
                disabled={!selectedLink || savingParams}
              >
                {savingParams ? "Saving..." : "Save Params"}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              {PARAM_KEYS.map((key) => (
                <label
                  key={key}
                  className="inline-flex items-center gap-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-3 w-3"
                    checked={paramFlags[key]}
                    onChange={(e) =>
                      setParamFlags((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                  />
                  <span>{PARAM_LABELS[key]}</span>
                </label>
              ))}
            </div>

            {selectedLink && (
              <div className="mt-2 text-[11px] text-gray-600 break-all">
                <span className="font-semibold">Preview:</span>{" "}
                {trackingUrlWithParams}
              </div>
            )}
          </div>

          {/* Rules table */}
          {rulesLoading ? (
            <p className="text-sm">Loading rules...</p>
          ) : filteredRules.length === 0 ? (
            <p className="text-sm text-gray-500">
              {selectedLink
                ? "No rules for this tracking link."
                : "Select a tracking link to view rules."}
            </p>
          ) : (
            <>
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-2 px-2 text-left">PUB</th>
                    <th className="py-2 px-2 text-left">Offer</th>
                    <th className="py-2 px-2 text-left">Advertiser</th>
                    <th className="py-2 px-2 text-left">Publisher</th>
                    <th className="py-2 px-2 text-left">Geo</th>
                    <th className="py-2 px-2 text-left">Carrier</th>
                    <th className="py-2 px-2 text-left">Type</th>
                    <th className="py-2 px-2 text-left">Device</th>
                    <th className="py-2 px-2 text-right">Priority</th>
                    <th className="py-2 px-2 text-right">Weight</th>
                    <th className="py-2 px-2 text-center">Fallback</th>
                    <th className="py-2 px-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRules.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="px-2 py-2">{selectedLink?.pub_code}</td>
                      <td className="px-2 py-2">
                        <div className="font-semibold">{r.offer_id}</div>
                        <div className="text-[11px] text-gray-600">
                          {r.offer_name}
                        </div>
                      </td>
                      <td className="px-2 py-2">{r.advertiser_name}</td>
                      <td className="px-2 py-2">
                        {selectedLink?.publisher_name}
                      </td>
                      <td className="px-2 py-2">{r.geo}</td>
                      <td className="px-2 py-2">{r.carrier}</td>
                      <td className="px-2 py-2">{r.offer_type}</td>
                      <td className="px-2 py-2">{r.device}</td>
                      <td className="px-2 py-2 text-right">{r.priority}</td>
                      <td className="px-2 py-2 text-right">{r.weight}</td>
                      <td className="px-2 py-2 text-center">
                        {r.is_fallback ? "YES" : "NO"}
                      </td>
                      <td className="px-2 py-2 text-center">
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

              {/* Pagination */}
              <div className="flex justify-between items-center mt-2 text-xs">
                <span>
                  Showing {startIdx + 1} –{" "}
                  {Math.min(startIdx + pageSize, filteredRules.length)} of{" "}
                  {filteredRules.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    className="border px-2 py-1 rounded disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageSafe <= 1}
                  >
                    Prev
                  </button>
                  <span>
                    Page {pageSafe} / {totalPages}
                  </span>
                  <button
                    className="border px-2 py-1 rounded disabled:opacity-50"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={pageSafe >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingRule ? "Edit Rule" : "Add Rule"}
            </h2>

            {/* Offer */}
            <div className="mb-3">
              <label className="block text-sm mb-1">Offer</label>
              <select
                className="border rounded px-2 py-1 w-full text-sm"
                value={ruleForm.offer_id}
                onChange={(e) =>
                  handleRuleFormChange("offer_id", e.target.value)
                }
              >
                <option value="">Select Offer</option>
                {offersLoading && <option>Loading...</option>}
                {!offersLoading &&
                  offers.map((o) => (
                    <option key={o.offer_id} value={o.offer_id}>
                      {o.offer_id} — {o.name} ({o.type})
                    </option>
                  ))}
              </select>
            </div>

            {/* Targeting */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-sm mb-1">Geo</label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={ruleForm.geo}
                  onChange={(e) =>
                    handleRuleFormChange("geo", e.target.value.toUpperCase())
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Carrier</label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-full text-sm"
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
                <label className="block text-sm mb-1">Device</label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-full text-sm"
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
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm mb-1">Priority</label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={ruleForm.priority}
                  onChange={(e) =>
                    handleRuleFormChange("priority", e.target.value)
                  }
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Weight</label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={ruleForm.is_fallback ? 0 : ruleForm.weight}
                  onChange={(e) =>
                    handleRuleFormChange("weight", e.target.value)
                  }
                  disabled={ruleForm.is_fallback}
                  min={0}
                />
              </div>
            </div>

            {/* Fallback */}
            <div className="mb-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ruleForm.is_fallback}
                  onChange={(e) =>
                    handleRuleFormChange("is_fallback", e.target.checked)
                  }
                />
                <span>Fallback Rule</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <button
                className="border px-4 py-2 rounded text-sm"
                onClick={closeRuleModal}
                disabled={savingRule}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-60"
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
