import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { Edit3, Trash2, RefreshCcw } from "lucide-react";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    geo: "",
    carrier: "",
    type: "CPA",
    advertiser_id: "",
    publisher_id: "",
    advertiser_payout: "",
    publisher_payout: "",
    cap_daily: "",
    flow_type: "direct",
  });
  const [editingId, setEditingId] = useState(null);

  /* ------------------- Fetch All Data ------------------- */
  const fetchOffers = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  /* ------------------- Handle Form Changes ------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ------------------- Auto-Calculate Publisher Payout ------------------- */
  useEffect(() => {
    if (form.advertiser_payout && !editingId) {
      const pubPayout = (parseFloat(form.advertiser_payout) * 0.8).toFixed(2);
      setForm((prev) => ({ ...prev, publisher_payout: pubPayout }));
    }
  }, [form.advertiser_payout, editingId]);

  /* ------------------- Handle Add or Update ------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        advertiser_payout: parseFloat(form.advertiser_payout),
        publisher_payout: parseFloat(form.publisher_payout),
        cap_daily: parseInt(form.cap_daily) || 0,
      };

      if (editingId) {
        await apiClient.put(`/offers/${editingId}`, payload);
        alert("✅ Offer updated successfully!");
      } else {
        await apiClient.post("/offers", payload);
        alert("✅ Offer added successfully!");
      }

      setForm({
        name: "",
        geo: "",
        carrier: "",
        type: "CPA",
        advertiser_id: "",
        publisher_id: "",
        advertiser_payout: "",
        publisher_payout: "",
        cap_daily: "",
        flow_type: "direct",
      });
      setEditingId(null);
      fetchOffers();
    } catch (err) {
      console.error("❌ Error saving offer:", err);
      alert("Error saving offer. Check logs.");
    }
  };

  /* ------------------- Edit Offer ------------------- */
  const handleEdit = (offer) => {
    setEditingId(offer.id);
    setForm({
      name: offer.name,
      geo: offer.geo,
      carrier: offer.carrier,
      type: offer.type,
      advertiser_id: offer.advertiser_id,
      publisher_id: offer.publisher_id || "",
      advertiser_payout: offer.advertiser_payout,
      publisher_payout: offer.publisher_payout,
      cap_daily: offer.cap_daily,
      flow_type: offer.flow_type,
    });
  };

  /* ------------------- Delete Offer ------------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await apiClient.delete(`/offers/${id}`);
      alert("🗑️ Offer deleted successfully!");
      fetchOffers();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Failed to delete offer.");
    }
  };

  /* ------------------- Render ------------------- */
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-white">
          Offers Management
        </h2>
        <button
          onClick={fetchOffers}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <RefreshCcw size={18} /> Refresh
        </button>
      </div>

      {/* Offer Form */}
      <form
        onSubmit={handleSubmit}
        className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
      >
        <input
          type="text"
          name="name"
          placeholder="Offer Name"
          value={form.name}
          onChange={handleChange}
          required
          className="p-2 border rounded w-full"
        />
        <input
          type="text"
          name="geo"
          placeholder="GEO (e.g. KW, IQ)"
          value={form.geo}
          onChange={handleChange}
          className="p-2 border rounded w-full"
        />
        <input
          type="text"
          name="carrier"
          placeholder="Carrier (e.g. Zain, STC)"
          value={form.carrier}
          onChange={handleChange}
          className="p-2 border rounded w-full"
        />

        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          className="p-2 border rounded w-full"
        >
          <option>CPA</option>
          <option>CPI</option>
          <option>CPL</option>
          <option>CPS</option>
          <option>INAPP</option>
        </select>

        <select
          name="advertiser_id"
          value={form.advertiser_id}
          onChange={handleChange}
          required
          className="p-2 border rounded w-full"
        >
          <option value="">Select Advertiser</option>
          {advertisers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          name="publisher_id"
          value={form.publisher_id}
          onChange={handleChange}
          className="p-2 border rounded w-full"
        >
          <option value="">Select Publisher (optional)</option>
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="0.01"
          name="advertiser_payout"
          placeholder="Advertiser Payout ($)"
          value={form.advertiser_payout}
          onChange={handleChange}
          required
          className="p-2 border rounded w-full"
        />

        <input
          type="number"
          step="0.01"
          name="publisher_payout"
          placeholder="Publisher Payout ($)"
          value={form.publisher_payout}
          onChange={handleChange}
          className="p-2 border rounded w-full"
        />

        <input
          type="number"
          name="cap_daily"
          placeholder="Daily Cap"
          value={form.cap_daily}
          onChange={handleChange}
          className="p-2 border rounded w-full"
        />

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full"
        >
          {editingId ? "Update Offer" : "Add Offer"}
        </button>
      </form>

      {/* Offers Table */}
      {loading ? (
        <p>Loading offers...</p>
      ) : offers.length === 0 ? (
        <p className="text-gray-500">No offers found.</p>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
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
                <tr
                  key={offer.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="p-2 font-medium">{offer.name}</td>
                  <td className="p-2">{offer.geo}</td>
                  <td className="p-2">{offer.carrier}</td>
                  <td className="p-2">{offer.type}</td>
                  <td className="p-2">{offer.advertiser_name || "-"}</td>
                  <td className="p-2">{offer.publisher_name || "-"}</td>
                  <td className="p-2">
                    ${offer.advertiser_payout} / ${offer.publisher_payout}
                  </td>
                  <td className="p-2">{offer.cap_daily}</td>
                  <td
                    className={`p-2 font-semibold ${
                      offer.status === "active"
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {offer.status}
                  </td>
                  <td className="p-2 flex gap-3">
                    <button
                      onClick={() => handleEdit(offer)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
