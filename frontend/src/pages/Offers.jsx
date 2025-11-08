import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({
    advertiser_id: "",
    name: "",
    type: "CPA",
    payout: "",
    tracking_url: "",
    landing_url: "",
    cap_daily: "",
    cap_total: "",
    status: "active",
    targets: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  // Fetch offers
  const fetchOffers = async () => {
    try {
      const res = await apiClient.get("/offers");
      setOffers(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch offers.");
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // Add or edit
  const saveOffer = async () => {
    try {
      const payload = { ...form };
      if (isEditing) {
        await apiClient.put(`/offers/${form.id}`, payload);
        alert("Offer updated");
      } else {
        await apiClient.post("/offers", payload);
        alert("Offer added");
      }
      resetForm();
      fetchOffers();
    } catch (err) {
      alert("Error saving offer");
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm({
      advertiser_id: "",
      name: "",
      type: "CPA",
      payout: "",
      tracking_url: "",
      landing_url: "",
      cap_daily: "",
      cap_total: "",
      status: "active",
      targets: [],
    });
    setIsEditing(false);
  };

  const editOffer = (offer) => {
    setForm(offer);
    setIsEditing(true);
  };

  const addTarget = () => {
    setForm({
      ...form,
      targets: [...form.targets, { geo: "", carrier: "" }],
    });
  };

  const updateTarget = (i, key, val) => {
    const newTargets = [...form.targets];
    newTargets[i][key] = val;
    setForm({ ...form, targets: newTargets });
  };

  const removeTarget = (i) => {
    const newTargets = [...form.targets];
    newTargets.splice(i, 1);
    setForm({ ...form, targets: newTargets });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-3">Advertiser Offers</h2>

      {/* Offer form */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <input
          placeholder="Advertiser ID"
          value={form.advertiser_id}
          onChange={(e) => setForm({ ...form, advertiser_id: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Offer name"
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
        <input
          placeholder="Tracking URL"
          value={form.tracking_url}
          onChange={(e) => setForm({ ...form, tracking_url: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Landing URL"
          value={form.landing_url}
          onChange={(e) => setForm({ ...form, landing_url: e.target.value })}
          className="border p-2 rounded"
        />
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
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <h4 className="font-semibold mb-2">Offer Targeting (Geo & Carrier)</h4>
      {form.targets.map((t, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            placeholder="Geo (e.g., IQ)"
            value={t.geo}
            onChange={(e) => updateTarget(i, "geo", e.target.value)}
            className="border p-2 rounded"
          />
          <input
            placeholder="Carrier (e.g., Zain)"
            value={t.carrier}
            onChange={(e) => updateTarget(i, "carrier", e.target.value)}
            className="border p-2 rounded"
          />
          <button
            onClick={() => removeTarget(i)}
            className="bg-red-500 text-white px-3 rounded"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addTarget}
        className="bg-green-600 text-white px-4 py-1 rounded mb-3"
      >
        + Add Target
      </button>

      <div>
        <button
          onClick={saveOffer}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {isEditing ? "Update Offer" : "Add Offer"}
        </button>
        {isEditing && (
          <button
            onClick={resetForm}
            className="ml-3 bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        )}
      </div>

      <hr className="my-4" />
      <h3 className="text-xl font-semibold mb-2">Offers List</h3>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">ID</th>
            <th className="p-2">Name</th>
            <th className="p-2">Type</th>
            <th className="p-2">Payout</th>
            <th className="p-2">Advertiser</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-2">{o.id}</td>
              <td className="p-2">{o.name}</td>
              <td className="p-2">{o.type}</td>
              <td className="p-2">{o.payout}</td>
              <td className="p-2">{o.advertiser_name}</td>
              <td className="p-2">{o.status}</td>
              <td className="p-2">
                <button
                  onClick={() => editOffer(o)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
