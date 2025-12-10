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
  const [autoName, setAutoName] = useState(true);

  // COMPLETE FORM (INCLUDES URL FIELDS)
  const [form, setForm] = useState({
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

    tracking_url: "",
    pin_send_url: "",
    pin_verify_url: "",
    check_status_url: "",
    portal_url: ""
  });

  /* ===============================
        LOAD DATA
  =============================== */
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

  /* ===============================
        HELPERS
  =============================== */

  const inappOffers = offers.filter((o) => o.type === "INAPP");

  const getOfferById = (offer_id) =>
    offers.find((o) => o.offer_id === offer_id);

  /** Auto-fill geo+carrier when selecting INAPP offer **/
  const handleOfferChange = (offer_id) => {
    const offer = getOfferById(offer_id);

    let geo = form.geo;
    let carrier = form.carrier;

    if (offer && Array.isArray(offer.targets) && offer.targets.length > 0) {
      const t = offer.targets[0];
      geo = t.geo || geo;
      carrier = t.carrier || carrier;
    }

    const updated = {
      ...form,
      offer_id,
      geo,
      carrier,
    };

    setForm(updated);
    maybeAutoGenerateName(updated);
  };

  /** Handle form updates **/
  const updateFormField = (key, value) => {
    const updated = { ...form, [key]: value };
    setForm(updated);

    if (key === "name") {
      setAutoName(false);
      return;
    }

    if (["geo", "carrier", "type", "offer_id"].includes(key)) {
      maybeAutoGenerateName(updated);
    }
  };

  /** Auto-generate name **/
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

  /** Validate form before saving **/
  const validateForm = () => {
    const errs = [];

    if (!form.publisher_id) errs.push("Publisher is required.");
    if (!form.geo) errs.push("Geo is required.");
    if (!form.carrier) errs.push("Carrier is required.");

    if (form.type === "INAPP" && !form.offer_id) {
      errs.push("INAPP type requires selecting an offer.");
    }

    setErrors(errs);
    return errs.length === 0;
  };

  /** Reset form **/
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

      tracking_url: "",
      pin_send_url: "",
      pin_verify_url: "",
      check_status_url: "",
      portal_url: ""
    });
    setErrors([]);
    setAutoName(true);
    setIsEditing(false);
  };

  /* ===============================
        SAVE + UPDATE
  =============================== */

  const saveTracking = async () => {
    try {
      if (!validateForm()) return;

      const payload = {
        publisher_id: form.publisher_id,
        offer_id: form.offer_id,
        name: form.name,
        geo: form.geo,
        carrier: form.carrier,
        type: form.type,
        payout: form.payout,
        cap_daily: form.cap_daily,
        cap_total: form.cap_total,
        hold_percent: form.hold_percent,
        landing_page_url: form.landing_page_url,

        tracking_url: form.tracking_url,
        pin_send_url: form.pin_send_url,
        pin_verify_url: form.pin_verify_url,
        check_status_url: form.check_status_url,
        portal_url: form.portal_url,
      };

      if (isEditing) {
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

  /** Load existing entry into form **/
  const editTracking = (row) => {
    setForm({
      id: row.id,
      publisher_id: row.publisher_id,
      offer_id: row.offer_id || "",
      name: row.name || "",
      geo: row.geo || "",
      carrier: row.carrier || "",
      type: row.type || "CPA",
      payout: row.payout || "",
      cap_daily: row.cap_daily || "",
      cap_total: row.cap_total || "",
      hold_percent: row.hold_percent || "",
      landing_page_url: row.landing_page_url || "",

      tracking_url: row.tracking_url || "",
      pin_send_url: row.pin_send_url || "",
      pin_verify_url: row.pin_verify_url || "",
      check_status_url: row.check_status_url || "",
      portal_url: row.portal_url || "",
    });

    setIsEditing(true);
    setErrors([]);
    setAutoName(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ===============================
        COPY HELPERS
  =============================== */

  const copyToClipboard = (text) => {
    if (!text) return alert("⚠ URL not available");

    navigator.clipboard
      .writeText(text)
      .then(() => alert("✅ Copied!"))
      .catch(() => alert("⚠ Failed to copy"));
  };

  const copyAllInappUrls = (row) => {
    const txt = `
SendPIN: ${row.pin_send_url}
VerifyPIN: ${row.pin_verify_url}
Status: ${row.check_status_url}
Portal: ${row.portal_url}
    `.trim();

    copyToClipboard(txt);
  };

  /* ===============================
        DISPLAY + FILTER
  =============================== */

  const filteredLinks = trackingLinks.filter((t) => {
    const q = search.toLowerCase();

    if (typeFilter !== "ALL" && t.type.toUpperCase() !== typeFilter)
      return false;

    return (
      t.publisher_name?.toLowerCase().includes(q) ||
      t.geo?.toLowerCase().includes(q) ||
      t.carrier?.toLowerCase().includes(q) ||
      t.name?.toLowerCase().includes(q)
    );
  });

  const typeClass = (t) => {
    if (!t) return "";
    const x = t.toUpperCase();
    if (x === "INAPP") return "text-blue-600 font-semibold";
    return "text-green-600 font-semibold";
  };

  /* ===============================
        UI
  =============================== */

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-3">Publisher Tracking URLs</h2>

      {errors.length > 0 && (
        <div className="mb-4 border border-red-300 bg-red-50 text-red-700 p-3 rounded">
          <b>Please fix the following:</b>
          <ul className="list-disc ml-4 mt-1 text-sm">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* FORM ROW 1 */}
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

      {/* FORM ROW 2 */}
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

      {/* LANDING URL */}
      <div className="mb-4">
        <input
          placeholder="Landing Page URL"
          value={form.landing_page_url}
          onChange={(e) => updateFormField("landing_page_url", e.target.value)}
          className="border p-2 rounded w-1/2"
        />
      </div>

      {/* ACTIONS */}
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

      {/* FILTERS */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="🔍 Search pub, geo, carrier, name…"
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

      {/* TABLE */}
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
              <td className="p-2">{t.cap_daily} / {t.cap_total}</td>
              <td className="p-2">{t.hold_percent}%</td>
              <td className="p-2 truncate max-w-[150px]">
                {t.landing_page_url}
              </td>

              <td className="p-2 text-xs text-blue-700">
                {t.type === "INAPP" ? (
                  <div className="flex flex-col gap-1">
                    <button onClick={() => copyToClipboard(t.pin_send_url)} className="hover:underline text-left">
                      🔹 SendPIN
                    </button>

                    <button onClick={() => copyToClipboard(t.pin_verify_url)} className="hover:underline text-left">
                      🔹 VerifyPIN
                    </button>

                    <button onClick={() => copyToClipboard(t.check_status_url)} className="hover:underline text-left">
                      🔹 Status
                    </button>

                    <button onClick={() => copyToClipboard(t.portal_url)} className="hover:underline text-left">
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
              <td colSpan={12} className="p-4 text-center text-gray-500">
                No tracking links found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
