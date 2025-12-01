import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";

/* ---------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------- */
export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [search, setSearch] = useState("");

  const [trackingLinks, setTrackingLinks] = useState([]);
  const [filteredLinks, setFilteredLinks] = useState([]);

  const [selectedLink, setSelectedLink] = useState(null);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);

  // RULE MODAL STATES
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [offers, setOffers] = useState([]);

  const [form, setForm] = useState({
    offer_id: "",
    geo: "",
    carrier: "",
    weight: "",
    is_fallback: false,
    autoFill: false,
  });

  /* ---------------------------------------------------------
      LOAD TRACKING LINKS
  --------------------------------------------------------- */
  const loadTrackingLinks = async () => {
    try {
      const res = await apiClient.get(`/distribution/tracking-links?pub_id=${pubId}`);
      if (res.data.success) {
        setTrackingLinks(res.data.links);
        setFilteredLinks(res.data.links);

        toast.success("Links loaded");
      } else toast.error("No links found");
    } catch (err) {
      toast.error("Failed to load tracking links");
    }
  };

  /* ---------------------------------------------------------
      SEARCH FILTER
  --------------------------------------------------------- */
  useEffect(() => {
    if (!search.trim()) setFilteredLinks(trackingLinks);
    else {
      setFilteredLinks(
        trackingLinks.filter((t) =>
          t.tracking_id.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, trackingLinks]);

  /* ---------------------------------------------------------
      LOAD META + RULES + REMAINING
  --------------------------------------------------------- */
  const loadMeta = async () => {
    if (!selectedLink) return;
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) {
        setMeta(res.data.meta);
      }
    } catch (err) {}
  };

  const loadRules = async () => {
    if (!selectedLink) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setRules(res.data.rules || []);
    } catch (err) {}
  };

  const loadRemaining = async () => {
    if (!selectedLink) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setRemaining(res.data.remaining);
    } catch (err) {}
  };

  useEffect(() => {
    if (selectedLink) {
      loadMeta();
      loadRules();
      loadRemaining();
    }
  }, [selectedLink]);

  /* ---------------------------------------------------------
      TOGGLE REQUIRED PARAM
  --------------------------------------------------------- */
  const toggleRequiredParam = async (key) => {
    const updated = {
      ...meta.required_params,
      [key]: !meta.required_params[key],
    };

    try {
      await apiClient.put("/publisher/update-required-params", {
        tracking_link_id: meta.tracking_link_id,
        required_params: updated,
      });

      setMeta((prev) => ({
        ...prev,
        required_params: updated,
      }));

      toast.success("Updated");
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  /* ---------------------------------------------------------
      LOAD OFFERS (based on GEO + Carrier)
  --------------------------------------------------------- */
  const loadOffers = async (geo, carrier) => {
    try {
      const res = await apiClient.get(
        `/offers/list?geo=${geo}&carrier=${carrier}`
      );
      if (res.data.success) setOffers(res.data.offers);
    } catch (err) {}
  };

  /* ---------------------------------------------------------
      OPEN RULE MODAL
  --------------------------------------------------------- */
  const openAddRule = () => {
    setEditRule(null);
    setForm({
      offer_id: "",
      geo: meta.geo,
      carrier: meta.carrier,
      weight: "",
      is_fallback: false,
      autoFill: false,
    });

    loadOffers(meta.geo, meta.carrier);
    setShowRuleModal(true);
  };

  const openEditRule = (r) => {
    setEditRule(r);
    setForm({
      offer_id: r.offer_id,
      geo: r.geo,
      carrier: r.carrier,
      weight: r.weight,
      is_fallback: r.is_fallback,
      autoFill: false,
    });

    loadOffers(r.geo, r.carrier);
    setShowRuleModal(true);
  };

  /* ---------------------------------------------------------
      SAVE RULE
  --------------------------------------------------------- */
  const saveRule = async () => {
    const payload = {
      pub_id: pubId,
      tracking_link_id: selectedLink,
      ...form,
      weight: form.weight ? Number(form.weight) : null,
      autoFill: !form.weight,
    };

    try {
      let res;

      if (editRule) {
        res = await apiClient.put(`/distribution/rules/${editRule.id}`, payload);
      } else {
        res = await apiClient.post(`/distribution/rules`, payload);
      }

      if (res.data.success) {
        toast.success("Saved");
        setShowRuleModal(false);
        loadRules();
        loadRemaining();
      } else toast.error(res.data.error || "Failed");
    } catch (err) {
      toast.error("Error saving rule");
    }
  };

  /* ---------------------------------------------------------
      DELETE RULE
  --------------------------------------------------------- */
  const deleteRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      toast.success("Deleted");
      loadRules();
      loadRemaining();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  /* =========================================================
      JSX START
  ========================================================= */
  return (
    <div className="p-6 space-y-8">

      {/* ------------------------------------------------------------------
         PUB INPUT + LOAD BUTTON
      ------------------------------------------------------------------ */}
      <div className="flex items-center gap-3">
        <input
          className="border p-3 rounded-lg w-64"
          placeholder="Enter PUB ID (PUB02)"
          value={pubId}
          onChange={(e) => setPubId(e.target.value.trim())}
        />

        <button
          onClick={loadTrackingLinks}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Load
        </button>
      </div>

      {/* ------------------------------------------------------------------
         SEARCH BAR
      ------------------------------------------------------------------ */}
      {trackingLinks.length > 0 && (
        <input
          className="border p-3 rounded-lg w-full"
          placeholder="Search tracking links…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {/* ------------------------------------------------------------------
         TRACKING LINKS GRID
      ------------------------------------------------------------------ */}
      {filteredLinks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((t) => (
            <div
              key={t.tracking_link_id}
              onClick={() => setSelectedLink(t.tracking_link_id)}
              className={`p-4 rounded-xl border bg-white cursor-pointer
                ${selectedLink === t.tracking_link_id ? "border-blue-600 bg-blue-50" : ""}
              `}
            >
              <p className="font-semibold">{t.tracking_id}</p>
              <p className="text-xs">{t.base_url}</p>
              <p className="text-xs text-gray-500 mt-1">
                GEO: {t.geo} | Carrier: {t.carrier}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------
         OVERVIEW + PARAMETERS 
      ------------------------------------------------------------------ */}
      {meta && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* OVERVIEW */}
          <div className="bg-white p-5 rounded-2xl shadow">
            <h3 className="font-bold text-lg mb-3">Distribution Overview</h3>
            <div className="space-y-1 text-sm">
              <p><b>Publisher:</b> {meta.pub_code}</p>
              <p><b>GEO:</b> {meta.geo}</p>
              <p><b>Carrier:</b> {meta.carrier}</p>
              <p><b>Remaining %:</b> {remaining}%</p>
            </div>
          </div>

          {/* REQUIRED PARAMETERS */}
          <div className="col-span-2 bg-white p-5 rounded-2xl shadow">
            <h3 className="font-bold text-lg mb-3">Required Tracking Parameters</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {meta.required_params &&
                Object.keys(meta.required_params).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm p-2 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={meta.required_params[key]}
                      onChange={() => toggleRequiredParam(key)}
                    />
                    {key.toUpperCase()}
                  </label>
                ))}
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------
         RULES TABLE
      ------------------------------------------------------------------ */}
      {selectedLink && (
        <div className="bg-white p-6 rounded-2xl shadow space-y-4">

          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Rules</h3>
            <button
              onClick={openAddRule}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
            >
              + Add Rule
            </button>
          </div>

          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Offer</th>
                <th className="p-2 border">GEO</th>
                <th className="p-2 border">Carrier</th>
                <th className="p-2 border">Weight</th>
                <th className="p-2 border">Fallback</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="text-center">
                  <td className="p-2 border">{r.offer_id}</td>
                  <td className="p-2 border">{r.geo}</td>
                  <td className="p-2 border">{r.carrier}</td>
                  <td className="p-2 border">{r.weight}%</td>
                  <td className="p-2 border">{r.is_fallback ? "YES" : "NO"}</td>

                  <td className="p-2 border flex justify-center gap-2">
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded"
                      onClick={() => openEditRule(r)}
                    >
                      Edit
                    </button>

                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded"
                      onClick={() => deleteRule(r.id)}
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

      {/* ------------------------------------------------------------------
         RULE MODAL
      ------------------------------------------------------------------ */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-[420px] space-y-4 shadow-xl">

            <h2 className="text-xl font-bold">
              {editRule ? "Edit Rule" : "Add Rule"}
            </h2>

            {/* OFFER DROPDOWN */}
            <div>
              <label className="text-sm font-semibold">Offer</label>
              <select
                className="w-full border p-2 rounded-lg"
                value={form.offer_id}
                onChange={(e) => setForm({ ...form, offer_id: e.target.value })}
              >
                <option value="">Select offer</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} — {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* GEO / CARRIER */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold">GEO</label>
                <input
                  className="border p-2 w-full rounded-lg"
                  value={form.geo}
                  onChange={(e) => setForm({ ...form, geo: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Carrier</label>
                <input
                  className="border p-2 w-full rounded-lg"
                  value={form.carrier}
                  onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                />
              </div>
            </div>

            {/* WEIGHT */}
            <div>
              <label className="text-sm font-semibold">
                Weight (remaining: {remaining}%)
              </label>
              <input
                className="border p-2 w-full rounded-lg"
                placeholder="Leave empty for AutoFill"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>

            {/* FALLBACK */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_fallback}
                onChange={(e) =>
                  setForm({ ...form, is_fallback: e.target.checked })
                }
              />
              Mark as Fallback Rule
            </label>

            {/* BUTTONS */}
            <div className="flex justify-between pt-3">
              <button
                className="px-4 py-2 rounded-lg bg-gray-300"
                onClick={() => setShowRuleModal(false)}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                onClick={saveRule}
              >
                {editRule ? "Update" : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
