// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubs, setPubs] = useState([]);
  const [trackingRows, setTrackingRows] = useState([]); // tracking links for selected pub
  const [offersForTarget, setOffersForTarget] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    pub_id: "",
    publisher_name: "",
    geo: "",
    carrier: "",
    type: "CPA",
    offer_id: "",
    percentage: "",
    sequence_order: 0,
    id: null // used when editing a distribution row
  });

  const fetchPubs = async () => {
    try {
      const res = await apiClient.get("/traffic-distribution/pubs");
      setPubs(res.data || []);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to load PUB_IDs");
    }
  };

  const fetchDistributions = async () => {
    try {
      const res = await apiClient.get("/traffic-distribution/list");
      setDistributions(res.data || []);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to load distributions");
    }
  };

  useEffect(() => {
    fetchPubs();
    fetchDistributions();
  }, []);

  // when PUB_ID changes -> load tracking rows for that publisher
  useEffect(() => {
    const loadTracking = async () => {
      if (!form.pub_id) {
        setTrackingRows([]);
        setOffersForTarget([]);
        return;
      }
      try {
        const res = await apiClient.get(`/traffic-distribution/tracking/${form.pub_id}`);
        setTrackingRows(res.data || []);
        // if there is at least 1 tracking row auto-fill using first row
        if (res.data && res.data.length) {
          const first = res.data[0];
          setForm((f) => ({
            ...f,
            publisher_name: first.publisher_name || first.publisher_name_db || "",
            geo: first.geo,
            carrier: first.carrier,
            type: first.type || "CPA"
          }));
          // load offers for target
          await loadOffersForTarget(first.geo, first.carrier);
        } else {
          setOffersForTarget([]);
        }
      } catch (err) {
        console.error(err);
        alert("⚠️ Failed to load tracking rows for PUB_ID");
      }
    };
    loadTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pub_id]);

  const loadOffersForTarget = async (geo, carrier) => {
    if (!geo || !carrier) {
      setOffersForTarget([]);
      return;
    }
    try {
      const res = await apiClient.get("/traffic-distribution/offers", {
        params: { geo, carrier }
      });
      setOffersForTarget(res.data || []);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to load offers for selected Geo/Carrier");
    }
  };

  // when geo or carrier manually changed -> refresh offers
  useEffect(() => {
    loadOffersForTarget(form.geo, form.carrier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.geo, form.carrier]);

  const resetForm = () => {
    setForm({
      pub_id: "",
      publisher_name: "",
      geo: "",
      carrier: "",
      type: "CPA",
      offer_id: "",
      percentage: "",
      sequence_order: 0,
      id: null
    });
  };

  const saveDistribution = async () => {
    try {
      if (!form.pub_id || !form.geo || !form.carrier || !form.offer_id || !form.percentage) {
        alert("Please choose PUB_ID, Geo, Carrier, Offer and Percentage");
        return;
      }
      const payload = {
        pub_id: form.pub_id,
        geo: form.geo,
        carrier: form.carrier,
        offer_id: form.offer_id,
        percentage: parseInt(form.percentage, 10) || 0,
        sequence_order: form.sequence_order || 0
      };

      if (form.id) {
        await apiClient.put(`/traffic-distribution/${form.id}`, payload);
        alert("✅ Distribution updated");
      } else {
        await apiClient.post("/traffic-distribution", payload);
        alert("✅ Distribution added");
      }
      resetForm();
      fetchDistributions();
    } catch (err) {
      alert("⚠️ " + (err.response?.data?.error || err.message));
      console.error(err);
    }
  };

  const editRow = (r) => {
    setForm({
      id: r.id,
      pub_id: r.pub_id,
      publisher_name: r.publisher_name,
      geo: r.geo,
      carrier: r.carrier,
      type: r.type || "CPA",
      offer_id: r.offer_id,
      percentage: r.percentage,
      sequence_order: r.sequence_order || 0
    });
  };

  const removeRow = async (id) => {
    if (!window.confirm("Remove this distribution row?")) return;
    try {
      await apiClient.delete(`/traffic-distribution/${id}`);
      alert("🗑️ Removed");
      fetchDistributions();
    } catch (err) {
      alert("⚠️ Failed to remove");
    }
  };

  const filtered = distributions.filter((d) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (d.publisher_name || "").toLowerCase().includes(q) ||
      (d.geo || "").toLowerCase().includes(q) ||
      (d.carrier || "").toLowerCase().includes(q) ||
      (d.offer_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traffic Distribution</h2>

      <div className="grid grid-cols-6 gap-3 mb-4">
        {/* PUB_ID selector loaded from tracking table */}
        <select
          value={form.pub_id}
          onChange={(e) => setForm({ ...form, pub_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select PUB_ID</option>
          {pubs.map((p) => (
            <option key={p.pub_id} value={p.pub_id}>
              PUB{p.pub_id} — {p.publisher_name || p.name || ""}
            </option>
          ))}
        </select>

        {/* Publisher Name (auto-fill, editable) */}
        <input
          value={form.publisher_name}
          onChange={(e) => setForm({ ...form, publisher_name: e.target.value })}
          placeholder="Publisher Name"
          className="border p-2 rounded"
        />

        {/* Geo (auto-filled from tracking row) */}
        <input
          value={form.geo}
          onChange={(e) => setForm({ ...form, geo: e.target.value })}
          placeholder="Geo (e.g. IQ)"
          className="border p-2 rounded"
        />

        {/* Carrier (auto-filled) */}
        <input
          value={form.carrier}
          onChange={(e) => setForm({ ...form, carrier: e.target.value })}
          placeholder="Carrier"
          className="border p-2 rounded"
        />

        {/* Offers dropdown populated with offers matching Geo+Carrier */}
        <select
          value={form.offer_id}
          onChange={(e) => setForm({ ...form, offer_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select Offer</option>
          {offersForTarget.map((o) => (
            <option key={o.offer_id} value={o.offer_id}>
              {o.offer_id} — {o.name} ({o.type})
            </option>
          ))}
        </select>

        {/* Percentage */}
        <input
          value={form.percentage}
          onChange={(e) => setForm({ ...form, percentage: e.target.value })}
          placeholder="%"
          className="border p-2 rounded"
        />
      </div>

      <div className="mb-4">
        <button onClick={saveDistribution} className="bg-blue-600 text-white px-4 py-2 rounded">
          {form.id ? "Update" : "Add"}
        </button>
        {form.id && (
          <button
            onClick={() => { resetForm(); }}
            className="ml-3 bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mb-3">
        <input
          placeholder="Search publisher/geo/carrier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
      </div>

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
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">PUB{r.pub_id}</td>
              <td className="p-2">{r.publisher_name}</td>
              <td className="p-2">{r.geo}</td>
              <td className="p-2">{r.carrier}</td>
              <td className="p-2">{r.offer_id}</td>
              <td className="p-2">{r.offer_name}</td>
              <td className="p-2">{r.percentage}%</td>
              <td className="p-2 flex gap-2">
                <button onClick={() => editRow(r)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                <button onClick={() => removeRow(r.id)} className="bg-red-600 text-white px-3 py-1 rounded">Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
