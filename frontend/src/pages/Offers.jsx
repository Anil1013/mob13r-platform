import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [form, setForm] = useState({
    id: null,
    name: "",
    geo: "",
    carrier: "",
    type: "CPA",
    advertiser_id: "",
    publisher_id: "",
    advertiser_payout: "",
    publisher_payout: "",
    cap_daily: "",
    status: "active",
  });
  const [isEditing, setIsEditing] = useState(false);

  // Fetch all data
  const fetchAll = async () => {
    try {
      const [offerRes, advRes, pubRes] = await Promise.all([
        apiClient.get("/offers"),
        apiClient.get("/advertisers"),
        apiClient.get("/publishers"),
      ]);
      setOffers(offerRes.data);
      setAdvertisers(advRes.data);
      setPublishers(pubRes.data);
    } catch (err) {
      alert("⚠️ Error loading data: " + err.message);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedForm = { ...form, [name]: value };

    // Auto calculate publisher payout (80% of advertiser payout)
    if (name === "advertiser_payout") {
      const advPayout = parseFloat(value);
      if (!isNaN(advPayout)) {
        updatedForm.publisher_payout = (advPayout * 0.8).toFixed(2);
      }
    }

    setForm(updatedForm);
  };

  // Submit offer (Add / Update)
  const handleSubmit = async () => {
    if (
      !form.name ||
      !form.geo ||
      !form.carrier ||
      !form.advertiser_id ||
      !form.advertiser_payout
    ) {
      return alert("⚠️ Please fill all required fields!");
    }

    try {
      if (isEditing) {
        await apiClient.put(`/offers/${form.id}`, form);
        alert("✅ Offer updated successfully!");
      } else {
        await apiClient.post("/offers", form);
        alert("✅ Offer added successfully!");
      }
      resetForm();
      fetchAll();
    } catch (err) {
      alert("⚠️ Error: " + (err.response?.data?.error || err.message));
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      geo: "",
      carrier: "",
      type: "CPA",
      advertiser_id: "",
      publisher_id: "",
      advertiser_payout: "",
      publisher_payout: "",
      cap_daily: "",
      status: "active",
    });
    setIsEditing(false);
  };

  const editOffer = (offer) => {
    setForm(offer);
    setIsEditing(true);
  };

  const deleteOffer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await apiClient.delete(`/offers/${id}`);
      fetchAll();
    } catch (err) {
      alert("⚠️ Error deleting offer: " + err.message);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Offers Management</h2>

      {/* FORM SECTION */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <input
          className="border p-2 rounded"
          name="name"
          placeholder="Offer Name"
          value={form.name}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          name="geo"
          placeholder="Geo (e.g., KW, IQ)"
          value={form.geo}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          name="carrier"
          placeholder="Carrier (e.g., STC, Zain, InApp)"
          value={form.carrier}
          onChange={handleChange}
        />
        <select
          className="border p-2 rounded"
          name="type"
          value={form.type}
          onChange={handleChange}
        >
          <option>CPA</option>
          <option>CPI</option>
          <option>CPL</option>
          <option>CPS</option>
          <option>INAPP</option>
        </select>
        <select
          className="border p-2 rounded"
          name="advertiser_id"
          value={form.advertiser_id}
          onChange={handleChange}
        >
          <option value="">Select Advertiser</option>
          {advertisers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className="border p-2 rounded"
          name="publisher_id"
          value={form.publisher_id}
          onChange={handleChange}
        >
          <option value="">Select Publisher</option>
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          className="border p-2 rounded"
          name="advertiser_payout"
          type="number"
          placeholder="Advertiser Payout ($)"
          value={form.advertiser_payout}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded bg-gray-50"
          name="publisher_payout"
          type="number"
          placeholder="Publisher Payout ($)"
          value={form.publisher_payout}
          onChange={handleChange}
          readOnly
        />
        <input
          className="border p-2 rounded"
          name="cap_daily"
          type="number"
          placeholder="Daily Cap"
          value={form.cap_daily}
          onChange={handleChange}
        />
        <button
          className="bg-green-600 text-white p-2 rounded col-span-3"
          onClick={handleSubmit}
        >
          {isEditing ? "Update Offer" : "Add Offer"}
        </button>
      </div>

      {isEditing && (
        <button
          onClick={resetForm}
          className="mb-4 text-red-500 underline text-sm"
        >
          Cancel Edit
        </button>
      )}

      {/* OFFERS TABLE */}
      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Type</th>
            <th className="p-2">Advertiser</th>
            <th className="p-2">Publisher</th>
            <th className="p-2">Adv Payout</th>
            <th className="p-2">Pub Payout</th>
            <th className="p-2">Cap</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="p-2">{o.name}</td>
              <td className="p-2">{o.geo}</td>
              <td className="p-2">{o.carrier}</td>
              <td className="p-2">{o.type}</td>
              <td className="p-2">{o.advertiser_name || "-"}</td>
              <td className="p-2">{o.publisher_name || "-"}</td>
              <td className="p-2">${o.advertiser_payout}</td>
              <td className="p-2">${o.publisher_payout}</td>
              <td className="p-2">{o.cap_daily}</td>
              <td className="p-2">{o.status}</td>
              <td className="p-2 flex gap-2">
                <button
                  className="text-blue-600 underline"
                  onClick={() => editOffer(o)}
                >
                  Edit
                </button>
                <button
                  className="text-red-600 underline"
                  onClick={() => deleteOffer(o.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
