import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [advertisers, setAdvertisers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    offer_id: "",
    advertiser_name: "",
    name: "",
    type: "CPA",
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
    const [resOffers, resAdv, resTemp] = await Promise.all([
      apiClient.get("/offers"),
      apiClient.get("/offers/advertisers"),
      apiClient.get("/templates"),
    ]);
    setOffers(resOffers.data);
    setFiltered(resOffers.data);
    setAdvertisers(resAdv.data);
    setTemplates(resTemp.data);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    setFiltered(
      offers.filter(
        (o) =>
          o.name.toLowerCase().includes(lower) ||
          o.advertiser_name.toLowerCase().includes(lower) ||
          (o.targets || []).some(
            (t) =>
              (t.geo || "").toLowerCase().includes(lower) ||
              (t.carrier || "").toLowerCase().includes(lower)
          )
      )
    );
  }, [search, offers]);

  const addTarget = () =>
    setForm({ ...form, targets: [...form.targets, { geo: "", carrier: "" }] });

  const updateTarget = (i, k, v) => {
    const t = [...form.targets];
    t[i][k] = v;
    setForm({ ...form, targets: t });
  };

  const removeTarget = (i) => {
    const t = [...form.targets];
    t.splice(i, 1);
    setForm({ ...form, targets: t });
  };

  const saveOffer = async () => {
    const payload = { ...form };
    if (payload.inapp_config && typeof payload.inapp_config === "string") {
      try {
        payload.inapp_config = JSON.parse(payload.inapp_config);
      } catch {
        return alert("⚠️ Invalid JSON in INAPP config");
      }
    }
    if (isEditing) await apiClient.put(`/offers/${form.offer_id}`, payload);
    else await apiClient.post("/offers", payload);
    alert("✅ Offer saved");
    resetForm();
    fetchAll();
  };

  const toggleStatus = async (id) => {
    await apiClient.put(`/offers/${id}/toggle`);
    fetchAll();
  };

  const editOffer = (o) => {
    setForm({
      ...o,
      inapp_config: o.inapp_config
        ? JSON.stringify(o.inapp_config, null, 2)
        : "",
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setForm({
      offer_id: "",
      advertiser_name: "",
      name: "",
      type: "CPA",
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

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-3">Advertiser Offers</h2>

      <div className="mb-3">
        <input
          className="border p-2 rounded w-1/3"
          placeholder="🔍 Search offer, advertiser, geo, or carrier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Offer table */}
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
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.offer_id} className="border-t">
              <td className="p-2 font-mono">{o.offer_id}</td>
              <td className="p-2">{o.name}</td>
              <td className="p-2">{o.advertiser_name}</td>
              <td className="p-2">
                {(o.targets || [])
                  .map((t) => `${t.geo || "-"} / ${t.carrier || "-"}`)
                  .join(", ")}
              </td>
              <td className="p-2">{o.type}</td>
              <td className="p-2">{o.payout}</td>
              <td className="p-2">
                {o.cap_daily} / {o.cap_total}
              </td>
              <td
                className={`p-2 font-semibold ${
                  o.status === "active" ? "text-green-600" : "text-red-600"
                }`}
              >
                {o.status}
              </td>
              <td className="p-2 flex gap-2">
                <button
                  onClick={() => editOffer(o)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleStatus(o.offer_id)}
                  className={`${
                    o.status === "active" ? "bg-red-600" : "bg-green-600"
                  } text-white px-3 py-1 rounded`}
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
