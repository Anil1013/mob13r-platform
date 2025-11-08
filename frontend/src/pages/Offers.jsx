import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    offer_id: "",
    advertiser_name: "",
    name: "",
    type: "CPA",
    offer_role: "normal", // <-- normal | fallback
    payout: "",
    tracking_url: "",
    cap_daily: "",
    cap_total: "",
    status: "active",
    fallback_offer_id: "",
    inapp_template_id: "",
    inapp_config: "",
    targets: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  const fetchAll = async () => {
    try {
      const [resOffers, resAdv, resTemp] = await Promise.all([
        apiClient.get("/offers"),
        apiClient.get("/offers/advertisers"),
        apiClient.get("/templates"),
      ]);
      setOffers(resOffers.data || []);
      setAdvertisers(resAdv.data || []);
      setTemplates(resTemp.data || []);
    } catch (err) {
      console.error("Fetch failed:", err);
      alert("⚠️ Failed to load offers/advertisers/templates");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () => {
    setForm({
      offer_id: "",
      advertiser_name: "",
      name: "",
      type: "CPA",
      offer_role: "normal",
      payout: "",
      tracking_url: "",
      cap_daily: "",
      cap_total: "",
      status: "active",
      fallback_offer_id: "",
      inapp_template_id: "",
      inapp_config: "",
      targets: [],
    });
    setIsEditing(false);
  };

  const saveOffer = async () => {
    try {
      const payload = { ...form };
      // parse inapp_config JSON if it's provided as string
      if (payload.inapp_config && typeof payload.inapp_config === "string") {
        try {
          payload.inapp_config = JSON.parse(payload.inapp_config);
        } catch {
          // leave as string for now or notify
          alert("⚠️ INAPP Config must be valid JSON");
          return;
        }
      }

      if (isEditing) {
        await apiClient.put(`/offers/${form.offer_id}`, payload);
      } else {
        await apiClient.post("/offers", payload);
      }
      alert("✅ Offer saved");
      resetForm();
      fetchAll();
    } catch (err) {
      console.error("Save offer error:", err);
      alert("⚠️ " + (err.response?.data?.error || err.message));
    }
  };

  const editOffer = (o) => {
    setForm({
      offer_id: o.offer_id,
      advertiser_name: o.advertiser_name,
      name: o.name,
      type: o.type,
      offer_role: o.offer_role || "normal",
      payout: o.payout,
      tracking_url: o.tracking_url || "",
      cap_daily: o.cap_daily,
      cap_total: o.cap_total,
      status: o.status,
      fallback_offer_id: o.fallback_offer_id || "",
      inapp_template_id: o.inapp_template_id || "",
      inapp_config: o.inapp_config ? JSON.stringify(o.inapp_config, null, 2) : "",
      targets: o.targets || [],
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleStatus = async (offer_id) => {
    try {
      await apiClient.put(`/offers/${offer_id}/toggle`);
      fetchAll();
    } catch (err) {
      console.error("Toggle status error", err);
      alert("⚠️ Failed to toggle status");
    }
  };

  const addTarget = () =>
    setForm({ ...form, targets: [...form.targets, { geo: "", carrier: "" }] });

  const updateTarget = (i, k, v) => {
    const arr = [...form.targets];
    arr[i][k] = v;
    setForm({ ...form, targets: arr });
  };

  const removeTarget = (i) => {
    const arr = [...form.targets];
    arr.splice(i, 1);
    setForm({ ...form, targets: arr });
  };

  const renderTypeFields = () => {
    if (["CPA", "CPI", "CPL", "CPS"].includes(form.type)) {
      return (
        <input
          placeholder="Tracking URL"
          value={form.tracking_url}
          onChange={(e) => setForm({ ...form, tracking_url: e.target.value })}
          className="border p-2 rounded"
        />
      );
    }
    if (form.type === "INAPP") {
      return (
        <>
          <select
            className="border p-2 rounded"
            value={form.inapp_template_id}
            onChange={(e) => setForm({ ...form, inapp_template_id: e.target.value })}
          >
            <option value="">Select Template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.template_name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="INAPP Config JSON"
            rows="4"
            value={form.inapp_config}
            onChange={(e) => setForm({ ...form, inapp_config: e.target.value })}
            className="border p-2 rounded w-full mt-2 font-mono"
          />
        </>
      );
    }
    return null;
  };

  // Filter by search term (offer name, advertiser, geo, carrier)
  const filteredOffers = offers.filter((o) => {
    const lower = (search || "").toLowerCase();
    if (!lower) return true;
    const matchOffer = o.name?.toLowerCase().includes(lower);
    const matchAdvertiser = o.advertiser_name?.toLowerCase().includes(lower);
    const matchTarget =
      (o.targets || []).some(
        (t) =>
          (t.geo || "").toLowerCase().includes(lower) ||
          (t.carrier || "").toLowerCase().includes(lower)
      );
    return matchOffer || matchAdvertiser || matchTarget;
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-3">Advertiser Offers</h2>

      {/* Offer Form */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <select
          value={form.advertiser_name}
          onChange={(e) => setForm({ ...form, advertiser_name: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select Advertiser</option>
          {advertisers.map((a, i) => (
            <option key={i} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Offer Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 rounded"
        />

        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
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
          onChange={(e) => setForm({ ...form, payout: e.target.value })}
          className="border p-2 rounded"
        />

        {renderTypeFields()}

        <input
          placeholder="Cap Daily"
          value={form.cap_daily}
          onChange={(e) => setForm({ ...form, cap_daily: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Cap Total"
          value={form.cap_total}
          onChange={(e) => setForm({ ...form, cap_total: e.target.value })}
          className="border p-2 rounded"
        />

        {/* Offer Role selector (normal / fallback) placed after caps */}
        <select
          value={form.offer_role}
          onChange={(e) => setForm({ ...form, offer_role: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="normal">Normal</option>
          <option value="fallback">Fallback</option>
        </select>

        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={form.fallback_offer_id}
          onChange={(e) => setForm({ ...form, fallback_offer_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select Fallback Offer (optional)</option>
          {offers.map((o) => (
            <option key={o.offer_id} value={o.offer_id}>
              {o.name} ({o.offer_id})
            </option>
          ))}
        </select>
      </div>

      <h4 className="font-semibold mb-2">Targeting (Geo & Carrier)</h4>
      {form.targets.map((t, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            placeholder="Geo (e.g. IQ)"
            value={t.geo}
            onChange={(e) => updateTarget(i, "geo", e.target.value)}
            className="border p-2 rounded"
          />
          <input
            placeholder="Carrier (e.g. Zain)"
            value={t.carrier}
            onChange={(e) => updateTarget(i, "carrier", e.target.value)}
            className="border p-2 rounded"
          />
          <button onClick={() => removeTarget(i)} className="bg-red-500 text-white px-3 rounded">
            ✕
          </button>
        </div>
      ))}
      <button onClick={addTarget} className="bg-green-600 text-white px-3 py-1 rounded mb-4">
        + Add Target
      </button>

      <div>
        <button onClick={saveOffer} className="bg-blue-600 text-white px-4 py-2 rounded">
          {isEditing ? "Update Offer" : "Add Offer"}
        </button>
        {isEditing && (
          <button onClick={resetForm} className="ml-3 bg-gray-400 text-white px-4 py-2 rounded">
            Cancel
          </button>
        )}
      </div>

      {/* ===== Search and Offers Table ===== */}
      <h3 className="text-xl font-semibold mt-6 mb-2">Offers List</h3>
      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Search offer, advertiser, geo, or carrier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
      </div>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Offer ID</th>
            <th className="p-2">Name</th>
            <th className="p-2">Advertiser</th>
            <th className="p-2">Geo / Carrier</th>
            <th className="p-2">Type</th>
            <th className="p-2">Payout</th>
            <th className="p-2">Cap (Daily / Total)</th>
            <th className="p-2">Role</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredOffers.map((o) => (
            <tr key={o.offer_id} className="border-t">
              <td className="p-2 font-mono">{o.offer_id}</td>
              <td className="p-2">{o.name}</td>
              <td className="p-2">{o.advertiser_name}</td>
              <td className="p-2">
                {(o.targets || []).map((t) => `${t.geo || "-"} / ${t.carrier || "-"}`).join(", ")}
              </td>
              <td className="p-2">{o.type}</td>
              <td className="p-2">{o.payout ?? "0.00"}</td>
              <td className="p-2">{o.cap_daily || 0} / {o.cap_total || 0}</td>
              <td className="p-2">{o.offer_role || "normal"}</td>
              <td className={`p-2 font-semibold ${o.status === "active" ? "text-green-600" : "text-red-600"}`}>
                {o.status}
              </td>
              <td className="p-2 flex gap-2">
                <button onClick={() => editOffer(o)} className="bg-yellow-500 text-white px-3 py-1 rounded">
                  Edit
                </button>
                <button
                  onClick={() => toggleStatus(o.offer_id)}
                  className={`${o.status === "active" ? "bg-red-600" : "bg-green-600"} text-white px-3 py-1 rounded`}
                >
                  {o.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
