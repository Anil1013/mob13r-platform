// File: frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

const PAGE_SIZE = 10;

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [links, setLinks] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);

  const [loadingLinks, setLoadingLinks] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);

  // Offers for dropdown
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null); // null = add mode

  // Rule form
  const [form, setForm] = useState({
    offer_id: "",
    geo: "ALL",
    carrier: "ALL",
    device: "ALL",
    priority: 1,
    weight: 100,
    is_fallback: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingRule, setSavingRule] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState(null);

  // Search + pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------------------------------------------
   * Helpers
   * ------------------------------------------- */

  const resetForm = () => {
    setForm({
      offer_id: "",
      geo: "ALL",
      carrier: "ALL",
      device: "ALL",
      priority: 1,
      weight: 100,
      is_fallback: false,
    });
    setFormErrors({});
  };

  const openAddModal = () => {
    if (!selectedLink) {
      alert("Please select a tracking link first.");
      return;
    }
    setEditingRule(null);
    resetForm();
    loadOffers();
    setIsModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setForm({
      offer_id: rule.offer_id,
      geo: rule.geo,
      carrier: rule.carrier,
      device: rule.device,
      priority: rule.priority,
      weight: rule.weight,
      is_fallback: rule.is_fallback,
    });
    setFormErrors({});
    loadOffers();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    resetForm();
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  /* ---------------------------------------------
   * API Calls
   * ------------------------------------------- */

  const loadLinks = async () => {
    if (!pubCode) {
      alert("Enter PUB Code (e.g. PUB03)");
      return;
    }
    setLoadingLinks(true);
    setSelectedLink(null);
    setRules([]);
    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_code=${encodeURIComponent(pubCode)}`
      );
      setLinks(res.data.items || []);
    } catch (err) {
      console.error("Fetch tracking links error:", err);
      alert("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadRules = async (link) => {
    setSelectedLink(link);
    setLoadingRules(true);
    setRules([]);
    setCurrentPage(1);
    try {
      const res = await apiClient.get(
        `/distribution/rules?tracking_link_id=${link.id}`
      );
      setRules(res.data.items || []);
    } catch (err) {
      console.error("Fetch rules error:", err);
      alert("Error loading rules");
    } finally {
      setLoadingRules(false);
    }
  };

  const loadOffers = async () => {
    // Already loaded once – skip
    if (offers.length > 0) return;
    setOffersLoading(true);
    try {
      const res = await apiClient.get("/distribution/offers");
      setOffers(res.data.items || []);
    } catch (err) {
      console.error("Fetch offers error:", err);
      alert("Error loading offers");
    } finally {
      setOffersLoading(false);
    }
  };

  const handleCopyTrackingUrl = async () => {
    if (!selectedLink) return;
    try {
      await navigator.clipboard.writeText(selectedLink.tracking_url);
      alert("Tracking URL copied to clipboard");
    } catch (err) {
      console.error("Clipboard error:", err);
      alert("Unable to copy. Please copy manually.");
    }
  };

  /* ---------------------------------------------
   * Rule Validation (client-side)
   * ------------------------------------------- */

  const validateRuleClient = () => {
    const errors = {};

    if (!form.offer_id) {
      errors.offer_id = "Offer is required";
    }
    if (!form.priority || Number(form.priority) <= 0) {
      errors.priority = "Priority must be a positive number";
    }
    if (Number.isNaN(Number(form.weight)) || Number(form.weight) < 0) {
      errors.weight = "Weight must be 0 or more";
    }

    // Duplicate check (local, excluding currently edited rule)
    const geo = form.geo || "ALL";
    const carrier = form.carrier || "ALL";
    const device = form.device || "ALL";

    const duplicate = rules.find((r) => {
      if (editingRule && r.id === editingRule.id) return false;
      return (
        r.offer_id === form.offer_id &&
        (r.geo || "ALL") === geo &&
        (r.carrier || "ALL") === carrier &&
        (r.device || "ALL") === device
      );
    });

    if (duplicate) {
      errors._global =
        "Duplicate rule: same Offer + Geo + Carrier + Device already exists.";
    }

    // Fallback uniqueness (local)
    if (form.is_fallback) {
      const otherFallback = rules.find((r) => {
        if (editingRule && r.id === editingRule.id) return false;
        return r.is_fallback;
      });

      if (otherFallback) {
        errors.is_fallback =
          "Another fallback rule already exists for this tracking link.";
      }
    }

    setFormErrors(errors);
    const hasError = Object.keys(errors).length > 0;
    return !hasError;
  };

  /* ---------------------------------------------
   * Save (Add / Edit)
   * ------------------------------------------- */

  const handleSaveRule = async () => {
    if (!selectedLink) {
      alert("Select a tracking link first.");
      return;
    }

    if (!validateRuleClient()) {
      return;
    }

    setSavingRule(true);
    try {
      const payload = {
        pub_code: selectedLink.pub_code,
        tracking_link_id: selectedLink.id,
        offer_id: form.offer_id,
        geo: form.geo || "ALL",
        carrier: form.carrier || "ALL",
        device: form.device || "ALL",
        priority: Number(form.priority) || 1,
        weight: Number(form.weight) || 0,
        is_fallback: !!form.is_fallback,
      };

      if (editingRule) {
        await apiClient.put(`/distribution/rules/${editingRule.id}`, payload);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }

      // reload rules
      await loadRules(selectedLink);
      closeModal();
    } catch (err) {
      console.error("Add/Edit rule error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Error saving rule";
      alert(msg);
    } finally {
      setSavingRule(false);
    }
  };

  /* ---------------------------------------------
   * Delete rule
   * ------------------------------------------- */

  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Delete rule for offer ${rule.offer_id}?`)) return;

    setDeletingId(rule.id);
    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      await loadRules(selectedLink);
    } catch (err) {
      console.error("Delete rule error:", err);
      alert("Error deleting rule");
    } finally {
      setDeletingId(null);
    }
  };

  /* ---------------------------------------------
   * Search + Pagination
   * ------------------------------------------- */

  const filteredRules = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rules;
    return rules.filter((r) => {
      const offer = (r.offer_id || "").toLowerCase();
      const offerName = (r.offer_name || "").toLowerCase();
      const geo = (r.geo || "").toLowerCase();
      const carrier = (r.carrier || "").toLowerCase();
      const device = (r.device || "").toLowerCase();
      return (
        offer.includes(term) ||
        offerName.includes(term) ||
        geo.includes(term) ||
        carrier.includes(term) ||
        device.includes(term)
      );
    });
  }, [rules, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRules.length / PAGE_SIZE) || 1
  );

  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRules.slice(start, start + PAGE_SIZE);
  }, [filteredRules, currentPage]);

  useEffect(() => {
    // When searchTerm changes, reset to page 1
    setCurrentPage(1);
  }, [searchTerm]);

  /* ---------------------------------------------
   * Render
   * ------------------------------------------- */

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution</h1>

      {/* PUB Code + Load button */}
      <div className="flex gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="PUB03"
          className="border rounded px-3 py-2 w-40"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.trim())}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={loadLinks}
          disabled={loadingLinks}
        >
          {loadingLinks ? "Loading..." : "Load Links"}
        </button>

        {selectedLink && (
          <button
            className="ml-4 text-sm border px-3 py-2 rounded"
            onClick={handleCopyTrackingUrl}
          >
            Copy Tracking URL
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
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

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {links.map((link) => (
              <div
                key={link.id}
                className={`p-2 border rounded cursor-pointer text-sm flex justify-between items-center ${
                  selectedLink?.id === link.id
                    ? "bg-blue-100 border-blue-400"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => loadRules(link)}
              >
                <div>
                  <div className="font-medium">
                    {link.name} ({link.pub_code})
                  </div>
                  <div className="text-xs text-gray-500">
                    {link.geo} • {link.carrier} • {link.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div className="border rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-semibold">Rules</h3>
              {selectedLink && (
                <div className="text-xs text-gray-500">
                  {selectedLink.name} ({selectedLink.pub_code})
                </div>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search rules..."
                className="border rounded px-2 py-1 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                className="bg-green-600 text-white text-sm px-3 py-1.5 rounded disabled:opacity-50"
                onClick={openAddModal}
                disabled={!selectedLink}
              >
                + Add Rule
              </button>
            </div>
          </div>

          {loadingRules && (
            <p className="text-sm text-gray-500">Loading rules...</p>
          )}

          {!loadingRules && rules.length === 0 && (
            <p className="text-sm text-gray-500">
              {selectedLink ? "No rules – add one." : "Select a tracking link."}
            </p>
          )}

          {rules.length > 0 && (
            <>
              <table className="w-full text-xs border">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Offer</th>
                    <th className="p-2 text-left">Geo</th>
                    <th className="p-2 text-left">Carrier</th>
                    <th className="p-2 text-left">Device</th>
                    <th className="p-2 text-right">Priority</th>
                    <th className="p-2 text-right">Weight</th>
                    <th className="p-2 text-center">Fallback</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRules.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="font-medium">{r.offer_id}</div>
                        <div className="text-[10px] text-gray-500">
                          {r.offer_name}
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
                      <td className="p-2 text-right space-x-2">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => openEditModal(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:underline disabled:opacity-50"
                          onClick={() => handleDeleteRule(r)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-2 text-xs">
                <div>
                  Showing{" "}
                  {filteredRules.length === 0
                    ? 0
                    : (currentPage - 1) * PAGE_SIZE + 1}{" "}
                  –{" "}
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredRules.length || 0
                  )}{" "}
                  of {filteredRules.length}
                </div>
                <div className="space-x-1">
                  <button
                    className="border px-2 py-1 rounded disabled:opacity-50"
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                  <span className="mx-1">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    className="border px-2 py-1 rounded disabled:opacity-50"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingRule ? "Edit Rule" : "Add Rule"}
            </h2>

            {formErrors._global && (
              <div className="mb-3 text-sm text-red-600">
                {formErrors._global}
              </div>
            )}

            <div className="space-y-3">
              {/* Offer */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Offer
                </label>
                <select
                  className="border rounded px-3 py-2 w-full text-sm"
                  value={form.offer_id}
                  onChange={(e) =>
                    handleFormChange("offer_id", e.target.value)
                  }
                >
                  <option value="">Select offer</option>
                  {offers.map((o) => (
                    <option key={o.offer_id} value={o.offer_id}>
                      {o.offer_id} — {o.name}
                    </option>
                  ))}
                </select>
                {offersLoading && (
                  <div className="text-[11px] text-gray-500 mt-1">
                    Loading offers...
                  </div>
                )}
                {formErrors.offer_id && (
                  <div className="text-[11px] text-red-600 mt-1">
                    {formErrors.offer_id}
                  </div>
                )}
              </div>

              {/* Targeting row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Geo
                  </label>
                  <input
                    className="border rounded px-3 py-2 w-full text-sm"
                    value={form.geo}
                    onChange={(e) =>
                      handleFormChange("geo", e.target.value || "ALL")
                    }
                    placeholder="ALL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Carrier
                  </label>
                  <input
                    className="border rounded px-3 py-2 w-full text-sm"
                    value={form.carrier}
                    onChange={(e) =>
                      handleFormChange(
                        "carrier",
                        e.target.value || "ALL"
                      )
                    }
                    placeholder="ALL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Device
                  </label>
                  <input
                    className="border rounded px-3 py-2 w-full text-sm"
                    value={form.device}
                    onChange={(e) =>
                      handleFormChange(
                        "device",
                        e.target.value || "ALL"
                      )
                    }
                    placeholder="ALL"
                  />
                </div>
              </div>

              {/* Priority / Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full text-sm"
                    value={form.priority}
                    onChange={(e) =>
                      handleFormChange("priority", e.target.value)
                    }
                  />
                  {formErrors.priority && (
                    <div className="text-[11px] text-red-600 mt-1">
                      {formErrors.priority}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 w-full text-sm"
                    value={form.weight}
                    onChange={(e) =>
                      handleFormChange("weight", e.target.value)
                    }
                  />
                  {formErrors.weight && (
                    <div className="text-[11px] text-red-600 mt-1">
                      {formErrors.weight}
                    </div>
                  )}
                </div>
              </div>

              {/* Fallback */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="is_fallback"
                  type="checkbox"
                  checked={form.is_fallback}
                  onChange={(e) =>
                    handleFormChange("is_fallback", e.target.checked)
                  }
                />
                <label
                  htmlFor="is_fallback"
                  className="text-sm select-none"
                >
                  Fallback Rule
                </label>
              </div>
              {formErrors.is_fallback && (
                <div className="text-[11px] text-red-600 -mt-1">
                  {formErrors.is_fallback}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded border"
                onClick={closeModal}
                disabled={savingRule}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
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
