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

  // ✅ Fetch all offers, advertisers & publishers
  const fetchData = async () => {
    try {
      const [offersRes, advRes, pubRes] = await Promise.all([
        apiClient.get("/offers"),
        apiClient.get("/advertisers"),
        apiClient.get("/publishers"),
      ]);
      setOffers(offersRes.data);
      setAdvertisers(advRes.data);
      setPublishers(pubRes.data);
    } catch (err) {
      console.error("⚠️ Error fetching data:", err);
      alert("Error loading data. Please check API connection.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Add or Update Offer
  const handleSubmit = async () => {
    const {
      name,
      geo,
      carrier,
      type,
      advertiser_id,
      publisher_id,
      advertiser_payout,
      publisher_payout,
      cap_daily,
    } = form;

    if (
      !name ||
      !geo ||
      !carrier ||
      !type ||
      !advertiser_id ||
      !publisher_id ||
      !advertiser_payout ||
      !publisher_payout
    ) {
      return alert("⚠️ Please fill all fields!");
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
      fetchData();
    } catch (err) {
      console.error("❌ Error saving offer:", err);
      alert("Failed to save offer.");
    }
  };

  // ✅ Reset form after submit / cancel
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

  // ✅ Edit Offer
  const handleEdit = (offer) => {
    setForm(offer);
    setIsEditing(true);
  };

  // ✅ Delete Offer
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await apiClient.delete(`/offers/${id}`);
      alert("🗑️ Offer deleted.");
      fetchData();
    } catch (err) {
      alert("Error deleting offer.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Offers Management</h2>

      {/* Add / Edit Form */}
      <div className="grid grid-cols-3 gap-3 mb-5 bg-white p-4 rounded shadow">
        <input
          className="border p-2 rounded"
          placeholder="Offer Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="border p-2 rounded"
          placeholder="GEO (e.g. KW, IQ)"
          value={form.geo}
          onChange={(e) => setForm({ ...form, geo: e.target.value })}
        />

        <input
          className="border p-2 rounded"
          placeholder="Carrier (e.g. Zain, STC, INAPP)"
          value={form.carrier}
          onChange={(e) => setForm({ ...form, carrier: e.target.value })}
        />

        <select
          className="border p-2 rounded"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="CPA">CPA</option>
          <option value="CPI">CPI</option>
          <option value="CPL">CPL</option>
          <option value="CPS">CPS</option>
          <option value="INAPP">INAPP</option>
        </select>

        <select
          className="border p-2 rounded"
          value={form.advertiser_id}
          onChange={(e) => setForm({ ...form, advertiser_id: e.target.value })}
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
          value={form.publisher_id}
          onChange={(e) => setForm({ ...form, publisher_id: e.target.value })}
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
          type="number"
          placeholder="Advertiser Payout ($)"
          value={form.advertiser_payout}
          onChange={(e) =>
            setForm({ ...form, advertiser_payout: e.target.value })
          }
        />

        <input
          className="border p-2 rounded"
          type="number"
          placeholder="Publisher Payout ($)"
          value={form.publisher_payout}
          onChange={(e) =>
            setForm({ ...form, publisher_payout: e.target.value })
          }
        />

        <input
          className="border p-2 rounded"
          type="number"
          placeholder="Daily Cap"
          value={form.cap_daily}
          onChange={(e) => setForm({ ...form, cap_daily: e.target.value })}
        />

        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
        >
          {isEditing ? "Update Offer" : "Add Offer"}
        </button>
      </div>

      {isEditing && (
        <button onClick={resetForm} className="text-red-500 underline mb-3">
          Cancel Edit
        </button>
      )}

      {/* Offers Table */}
      <table className="min-w-full bg-white shadow rounded text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Offer Name</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Type</th>
            <th className="p-2">Advertiser</th>
            <th className="p-2">Publisher</th>
            <th className="p-2">Payouts</th>
            <th className="p-2">Cap</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id} className="border-b">
              <td className="p-2">{offer.name}</td>
              <td className="p-2">{offer.geo}</td>
              <td className="p-2">{offer.carrier}</td>
              <td className="p-2">{offer.type}</td>
              <td className="p-2">{offer.advertiser_name}</td>
              <td className="p-2">{offer.publisher_name}</td>
              <td className="p-2">
                Adv: ${offer.advertiser_payout} | Pub: ${offer.publisher_payout}
              </td>
              <td className="p-2">{offer.cap_daily}</td>
              <td className="p-2">{offer.status}</td>
              <td className="p-2 flex gap-2">
                <button
                  className="text-blue-600 underline"
                  onClick={() => handleEdit(offer)}
                >
                  Edit
                </button>
                <button
                  className="text-red-600 underline"
                  onClick={() => handleDelete(offer.id)}
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
