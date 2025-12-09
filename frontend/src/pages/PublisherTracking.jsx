// File: frontend/src/pages/PublisherTracking.jsx

import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Tracking() {
  const [publishers, setPublishers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState([]);

  // track if name is auto-generated or user-edited
  const [autoName, setAutoName] = useState(true);

  const [form, setForm] = useState({
    id: null, // used only when editing
    publisher_id: "",
    offer_id: "",
    name: "",
    geo: "",
    carrier: "",
    type: "CPA",
    payout: "",
    cap_daily: "",
    cap_total: "",
    hold_percent: "",
    landing_page_url: "",
  });

  /* -------------------------------------------
     LOAD DATA
  ------------------------------------------- */
  const fetchData = async () => {
    try {
      const [pubRes, offerRes, trackRes] = await Promise.all([
        apiClient.get("/publishers"),
        apiClient.get("/offers"),
        apiClient.get("/tracking"),
      ]);

      setPublishers(pubRes.data || []);
      setOffers(offerRes.data || []);
      setTrackingLinks(trackRes.data || []);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to load tracking data");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* -------------------------------------------
     HELPERS
  ------------------------------------------- */

  const inappOffers = offers.filter((o) => o.type === "INAPP");

  const getOfferById = (offer_id) =>
    offers.find((o) => o.offer_id === offer_id);

  // Auto-fill geo/carrier when INAPP offer selected
  const handleOfferChange = (offer_id) => {
    const offer = getOfferById(offer_id);
    let newGeo = form.geo;
    let newCarrier = form.carrier;

    if (offer && Array.isArray(offer.targets) && offer.targets.length > 0) {
      const firstTarget = offer.targets[0];
      // Only override if empty OR autoName is still true (means user hasn't customized)
      newGeo = firstTarget.geo || form.geo;
      newCarrier = firstTarget.carrier || form.carrier;
    }

    const updatedForm = {
      ...form,
      offer_id,
      geo: newGeo,
      carrier: newCarrier,
    };

    setForm(updatedForm);
    maybeAutoGenerateName(updatedForm);
  };

  // Handle field change + autoName logic
  const updateFormField = (key, value) => {
    const updated = { ...form, [key]: value };
    setForm(updated);

    // If user directly types name -> stop auto generation
    if (key === "name") {
      setAutoName(false);
      return;
    }

    // On some fields, if autoName still true, regenerate
    if (["geo", "carrier", "type", "offer_id"].includes(key)) {
      maybeAutoGenerateName(updated);
    }
  };

  // Auto-generate tracking name, only if user didn't override
  const maybeAutoGenerateName = (currentForm) => {
    if (!autoName) return;

    const offer = getOfferById(currentForm.offer_id);
    const offerPart = offer ? offer.name.replace(/\s+/g, "") : "Offer";
    const geoPart = currentForm.geo || "ALL";
    const carrierPart = currentForm.carrier || "ALL";
    const typePart = currentForm.type || "CPA";

    const generated = `${offerPart}_${geoPart}_${carrierPart}_${typePart}`;
    setForm((prev) => ({ ...prev, name: generated }));
  };

  // Validation
  const validateForm = () => {
    const errs = [];

    if (!form.publisher_id) errs.push("Publisher is required.");
    if (!form.geo) errs.push("Geo is required.");
    if (!form.carrier) errs.push("Carrier is required.");

    if (!form.type) errs.push("Type is required.");

    if (form.type === "INAPP") {
      if (!form.offer_id) {
        errs.push("INAPP type requires selecting an INAPP offer.");
      }
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const resetForm = () => {
    setForm({
      id: null,
      publisher_id: "",
      offer_id: "",
      name: "",
      geo: "",
      carrier: "",
      type: "CPA",
      payout: "",
      cap_daily: "",
      cap_total: "",
      hold_percent: "",
      landing_page_url: "",
    });
    setIsEditing(false);
    setErrors([]);
    setAutoName(true);
  };

  /* -------------------------------------------
     SAVE / EDIT
  ------------------------------------------- */

  const saveTracking = async () => {
    try {
      if (!validateForm()) return;

      const payload = { ...form };
      // Backend does not expect id in payload
      delete payload.id;

      if (isEditing && form.id) {
        await apiClient.put(`/tracking/${form.id}`, payload);
        alert("✅ Tracking URL updated successfully");
      } else {
        await apiClient.post("/tracking", payload);
        alert("✅ Tracking URL added successfully");
      }

      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to save tracking URL");
    }
  };

  const editTracking = (item) => {
    setForm({
      id: item.id,
      publisher_id: item.publisher_id,
      offer_id: item.offer_id || "",
      name: item.name || "",
      geo: item.geo || "",
      carrier: item.carrier || "",
      type: item.type || "CPA",
      payout: item.payout || "",
      cap_daily: item.cap_daily || "",
      cap_total: item.cap_total || "",
      hold_percent: item.hold_percent || "",
      landing_page_url: item.landing_page_url || "",
    });
    setIsEditing(true);
    setErrors([]);
    setAutoName(false); // editing existing = respect user name
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* -------------------------------------------
     COPY HELPERS
  ------------------------------------------- */

  const copyToClipboard = (text) => {
    if (!text) {
      alert("⚠️ URL not available");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => alert("✅ Copied to clipboard!"))
      .catch(() => alert("⚠️ Failed to copy"));
  };

  const copyAllInappUrls = (row) => {
    const content = [
      `SendPIN: ${row.pin_send_url || ""}`,
      `VerifyPIN: ${row.pin_verify_url || ""}`,
      `Status: ${row.check_status_url || ""}`,
      `Portal: ${row.portal_url || ""}`,
    ].join("\n");
    copyToClipboard(content);
  };

  /* -------------------------------------------
     FILTERING / DISPLAY
  ------------------------------------------- */

  const filteredLinks = trackingLinks.filter((t) => {
    const lower = search.toLowerCase();

    if (
      typeFilter !== "ALL" &&
      t.type &&
      t.type.toUpperCase() !== typeFilter
    ) {
      return false;
    }

    return (
      t.publisher_name?.toLowerCase().includes(lower) ||
      t.geo?.toLowerCase().includes(lower) ||
      t.carrier?.toLowerCase().includes(lower) ||
      t.name?.toLowerCase().includes(lower)
    );
  });

  const typeClass = (type) => {
    const t = (type || "").toUpperCase();
    if (t === "INAPP") return "text-blue-600 font-semibold";
    if (t === "CPA" || t === "CPI" || t === "CPL" || t === "CPS")
      return "text-green-600 font-semibold";
    return "text-gray-700";
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-3">Publisher Tracking URLs</h2>

      {/* Validation Panel */}
      {errors.length > 0 && (
        <div className="mb-4 border border-red-300 bg-red-50 text-red-700 p-3 rounded">
          <div className="font-semibold mb-1">Please fix the following:</div>
          <ul className="list-disc list-inside text-sm">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Form Row 1 */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <select
          value={form.publisher_id}
          onChange={(e) => updateFormField("publisher_id", e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Publisher</option>
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Offer selection only for INAPP */}
        {form.type === "INAPP" ? (
          <select
            value={form.offer_id}
            onChange={(e) => handleOfferChange(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select INAPP Offer</option>
            {inappOffers.map((o) => (
              <option key={o.offer_id} value={o.offer_id}>
                {o.name} ({o.offer_id})
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center text-xs text-gray-500">
            {/* Empty space to keep layout grid aligned */}
            No offer needed for non-INAPP
          </div>
        )}

        <input
          placeholder="Tracking Name"
          value={form.name}
          onChange={(e) => updateFormField("name", e.target.value)}
          className="border p-2 rounded"
        />
        <input
          placeholder="Geo"
          value={form.geo}
          onChange={(e) => updateFormField("geo", e.target.value)}
          className="border p-2 rounded"
        />
        <input
          placeholder="Carrier"
          value={form.carrier}
          onChange={(e) => updateFormField("carrier", e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      {/* Form Row 2 */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <select
          value={form.type}
          onChange={(e) => updateFormField("type", e.target.value)}
          className="border p-2 rounded"
        >
          <option>CPA</option>
          <option>CPI</option>
          <option>CPL</option>
          <option>CPS</option>
          <option>INAPP</option>
        </select>

        <input
          placeholder="Payout"
          value={form.payout}
          onChange={(e) => updateFormField("payout", e.target.value)}
          className="border p-2 rounded"
        />
        <input
          placeholder="Cap Daily"
          value={form.cap_daily}
          onChange={(e) => updateFormField("cap_daily", e.target.value)}
          className="border p-2 rounded"
        />
        <input
          placeholder="Cap Total"
          value={form.cap_total}
          onChange={(e) => updateFormField("cap_total", e.target.value)}
          className="border p-2 rounded"
        />
        <input
          placeholder="Hold %"
          value={form.hold_percent}
          onChange={(e) => updateFormField("hold_percent", e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      {/* Landing URL */}
      <div className="mb-4">
        <input
          placeholder="Landing Page URL (for fallback click / info)"
          value={form.landing_page_url}
          onChange={(e) => updateFormField("landing_page_url", e.target.value)}
          className="border p-2 rounded w-1/2"
        />
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-3 items-center">
        <button
          onClick={saveTracking}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {isEditing ? "Update Tracking URL" : "Add Tracking URL"}
        </button>
        {isEditing && (
          <button
            onClick={resetForm}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="🔍 Search pub, geo, carrier, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
        <select
          className="border p-2 rounded"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="ALL">All Types</option>
          <option value="CPA">CPA</option>
          <option value="CPI">CPI</option>
          <option value="CPL">CPL</option>
          <option value="CPS">CPS</option>
          <option value="INAPP">INAPP</option>
        </select>
        <span className="text-xs text-gray-500">
          {filteredLinks.length} tracking link(s)
        </span>
      </div>

      {/* Table */}
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">PUB_ID</th>
            <th className="p-2">Publisher</th>
            <th className="p-2">Name</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Type</th>
            <th className="p-2">Payout</th>
            <th className="p-2">Cap</th>
            <th className="p-2">Hold</th>
            <th className="p-2">Landing</th>
            <th className="p-2">Tracking / INAPP URLs</th>
            <th className="p-2">Edit</th>
          </tr>
        </thead>
        <tbody>
          {filteredLinks.map((t) => (
            <tr key={t.id} className="border-t hover:bg-gray-50">
              <td className="p-2 font-mono">{t.pub_code}</td>
              <td className="p-2">{t.publisher_name}</td>
              <td className="p-2">{t.name}</td>
              <td className="p-2">{t.geo}</td>
              <td className="p-2">{t.carrier}</td>
              <td className={`p-2 ${typeClass(t.type)}`}>{t.type}</td>
              <td className="p-2">{t.payout}</td>
              <td className="p-2">
                {t.cap_daily} / {t.cap_total}
              </td>
              <td className="p-2">{t.hold_percent}%</td>
              <td className="p-2 truncate max-w-[150px]">
                {t.landing_page_url}
              </td>
              <td className="p-2 text-xs text-blue-700">
                {t.type === "INAPP" ? (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => copyToClipboard(t.pin_send_url)}
                      className="hover:underline text-left"
                    >
                      🔹 SendPIN
                    </button>
                    <button
                      onClick={() => copyToClipboard(t.pin_verify_url)}
                      className="hover:underline text-left"
                    >
                      🔹 VerifyPIN
                    </button>
                    <button
                      onClick={() => copyToClipboard(t.check_status_url)}
                      className="hover:underline text-left"
                    >
                      🔹 Status
                    </button>
                    <button
                      onClick={() => copyToClipboard(t.portal_url)}
                      className="hover:underline text-left"
                    >
                      🔹 Portal
                    </button>
                    <button
                      onClick={() => copyAllInappUrls(t)}
                      className="hover:underline text-left font-semibold mt-1"
                    >
                      📋 Copy All
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => copyToClipboard(t.tracking_url)}
                    className="hover:underline text-left"
                  >
                    🔹 Click URL
                  </button>
                )}
              </td>
              <td className="p-2">
                <button
                  onClick={() => editTracking(t)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {filteredLinks.length === 0 && (
            <tr>
              <td
                colSpan={12}
                className="p-4 text-center text-sm text-gray-500"
              >
                No tracking links found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
