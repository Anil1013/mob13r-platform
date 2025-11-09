import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [publishers, setPublishers] = useState([]);
  const [geoCarrierList, setGeoCarrierList] = useState([]);
  const [offers, setOffers] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [form, setForm] = useState({
    pub_id: "",
    geo: "",
    carrier: "",
    offer_id: "",
    percentage: "",
  });
  const [search, setSearch] = useState("");

  /* ======================================================
     🟢 LOAD PUBLISHERS
     ====================================================== */
  useEffect(() => {
    loadPublishers();
    loadDistributions();
  }, []);

  const loadPublishers = async () => {
    try {
      const res = await apiClient.get("/publishers");
      setPublishers(res.data);
    } catch (err) {
      alert("Failed to load publishers");
    }
  };

  const loadDistributions = async () => {
    try {
      const res = await apiClient.get("/trafficDistribution");
      setDistributions(res.data);
    } catch (err) {
      alert("Failed to load distributions");
    }
  };

  /* ======================================================
     🟢 ON PUB_ID SELECT → FETCH GEO + CARRIER
     ====================================================== */
  const handlePublisherSelect = async (pub_id) => {
    setForm({ pub_id, geo: "", carrier: "", offer_id: "", percentage: "" });
    setGeoCarrierList([]);
    setOffers([]);

    if (!pub_id) return;

    try {
      const res = await apiClient.get(`/trafficDistribution/geo-carrier/${pub_id}`);
      setGeoCarrierList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ======================================================
     🟢 ON GEO + CARRIER SELECT → FETCH OFFERS
     ====================================================== */
  const handleGeoCarrierChange = async (geo, carrier) => {
    setForm((f) => ({ ...f, geo, carrier, offer_id: "" }));
    if (!geo || !carrier) return;

    try {
      const res = await apiClient.get(
        `/trafficDistribution/offers?geo=${geo}&carrier=${carrier}`
      );
      setOffers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ======================================================
     🟢 ADD NEW DISTRIBUTION
     ====================================================== */
  const addDistribution = async () => {
    if (!form.pub_id || !form.geo || !form.carrier || !form.offer_id) {
      return alert("Please select all required fields");
    }
    try {
      await apiClient.post("/trafficDistribution", form);
      alert("Added successfully");
      loadDistributions();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add");
    }
  };

  const filtered = distributions.filter((d) =>
    `${d.publisher_name} ${d.geo} ${d.carrier} ${d.offer_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-3">Traffic Distribution</h2>

      {/* Form Section */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <select
          value={form.pub_id}
          onChange={(e) => handlePublisherSelect(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select PUB_ID</option>
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              PUB{p.id} ({p.name})
            </option>
          ))}
        </select>

        <select
          value={form.geo}
          onChange={(e) =>
            handleGeoCarrierChange(e.target.value, form.carrier)
          }
          className="border p-2 rounded"
        >
          <option value="">Geo</option>
          {[...new Set(geoCarrierList.map((g) => g.geo))].map((geo) => (
            <option key={geo}>{geo}</option>
          ))}
        </select>

        <select
          value={form.carrier}
          onChange={(e) =>
            handleGeoCarrierChange(form.geo, e.target.value)
          }
          className="border p-2 rounded"
        >
          <option value="">Carrier</option>
          {[...new Set(geoCarrierList.map((g) => g.carrier))].map((carrier) => (
            <option key={carrier}>{carrier}</option>
          ))}
        </select>

        <select
          value={form.offer_id}
          onChange={(e) => setForm({ ...form, offer_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select Offer</option>
          {offers.map((o) => (
            <option key={o.offer_id} value={o.offer_id}>
              {o.offer_id} - {o.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="%"
          value={form.percentage}
          onChange={(e) => setForm({ ...form, percentage: e.target.value })}
          className="border p-2 rounded"
        />

        <button
          onClick={addDistribution}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      <input
        type="text"
        placeholder="Search publisher/geo/carrier..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 rounded mb-3 w-1/3"
      />

      {/* Distribution Table */}
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">PUB_ID</th>
            <th className="p-2">Publisher</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Offer ID</th>
            <th className="p-2">Offer Name</th>
            <th className="p-2">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="p-2 font-mono">PUB{d.pub_id}</td>
              <td className="p-2">{d.publisher_name}</td>
              <td className="p-2">{d.geo}</td>
              <td className="p-2">{d.carrier}</td>
              <td className="p-2">{d.offer_id}</td>
              <td className="p-2">{d.offer_name}</td>
              <td className="p-2">{d.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
