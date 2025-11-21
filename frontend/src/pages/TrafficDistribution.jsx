// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  /* ============================
     STATE
  ============================ */
  const [pubCode, setPubCode] = useState("");
  const [meta, setMeta] = useState([]); // tracking links for selected pub
  const [publisherDetails, setPublisherDetails] = useState(null);

  const [selectedTracking, setSelectedTracking] = useState("");
  const [offers, setOffers] = useState([]);
  const [rules, setRules] = useState([]);

  const [offerId, setOfferId] = useState("");
  const [weight, setWeight] = useState(100);
  const [remaining, setRemaining] = useState(100);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  /* Overview + search */
  const [overview, setOverview] = useState([]);
  const [search, setSearch] = useState("");

  /* UI helpers */
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);

  /* ============================
     HELPERS / API LOADERS
  ============================ */

  // Load global overview (all PUB_ID rules)
  const loadOverview = async () => {
    try {
      setLoadingOverview(true);
      const r = await apiClient.get("/distribution/overview");
      setOverview(r.data || []);
    } catch (err) {
      console.warn("overview error", err);
      setOverview([]);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Load tracking links (meta) for a pub_code
  const loadMeta = async () => {
    if (!pubCode) return alert("Please enter a PUB_ID (e.g. PUB03)");
    try {
      setLoadingMeta(true);
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${encodeURIComponent(pubCode)}`
      );
      const rows = res.data || [];
      setMeta(rows);

      if (rows.length) {
        // Set defaults based on first row
        const first = rows[0];
        setSelectedTracking(first.tracking_link_id);
        setPublisherDetails({
          pub_code: first.pub_code,
          publisher_id: first.publisher_id,
          publisher_name: first.publisher_name,
          combos: rows.map((d) => `${d.geo}/${d.carrier}`).join(", "),
        });

        // After meta loaded, load rules for this pub and remaining
        await loadRules(first.pub_code);
        await loadRemaining(first.pub_code, first.tracking_link_id);
      } else {
        setSelectedTracking("");
        setPublisherDetails(null);
        setRules([]);
        setRemaining(100);
      }
    } catch (err) {
      console.error("meta failed", err);
      setMeta([]);
      setPublisherDetails(null);
      setRules([]);
      setRemaining(100);
    } finally {
      setLoadingMeta(false);
    }
  };

  // Load offers for selected tracking (filters out already used offers)
  const loadOffers = async (trackingId = selectedTracking) => {
    if (!trackingId || !meta.length) return setOffers([]);
    setLoadingOffers(true);
    try {
      const track = meta.find((m) => Number(m.tracking_link_id) === Number(trackingId));
      if (!track) {
        setOffers([]);
        return;
      }

      const exclude = rules
        .filter((r) => Number(r.tracking_link_id) === Number(trackingId))
        .map((r) => r.offer_id)
        .filter(Boolean)
        .join(",");

      const q = `/distribution/offers?geo=${encodeURIComponent(track.geo || "")}&carrier=${encodeURIComponent(
        track.carrier || ""
      )}${exclude ? `&exclude=${exclude}` : ""}`;

      const res = await apiClient.get(q);
      setOffers(res.data || []);
    } catch (err) {
      console.error("offers error", err);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Load rules for a pub
  const loadRules = async (code) => {
    if (!code) return;
    try {
      const r = await apiClient.get(`/distribution/rules?pub_id=${encodeURIComponent(code)}`);
      setRules(r.data || []);
    } catch (err) {
      console.error("rules error", err);
      setRules([]);
    }
  };

  // Load remaining % for a pub (optionally for a tracking link)
  const loadRemaining = async (pub, trackingLinkId = "") => {
    if (!pub) return setRemaining(100);
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${encodeURIComponent(pub)}${trackingLinkId ? `&tracking_link_id=${encodeURIComponent(trackingLinkId)}` : ""}`
      );
      setRemaining(res.data?.remaining ?? 100);
    } catch {
      setRemaining(100);
    }
  };

  /* ============================
     EFFECTS
  ============================ */

  // whenever selected tracking changes, reload offers and remaining
  useEffect(() => {
    loadOffers(selectedTracking);
    if (publisherDetails?.pub_code) {
      loadRemaining(publisherDetails.pub_code, selectedTracking);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTracking, rules, meta]);

  // load overview once on component mount
  useEffect(() => {
    loadOverview();
  }, []);

  /* ============================
     ACTIONS: add / edit / delete rule
  ============================ */

  const resetForm = () => {
    setOfferId("");
    setWeight(100);
    setIsEditing(false);
    setEditId(null);
  };

  const addOrUpdateRule = async () => {
    if (!publisherDetails) return alert("Load publisher meta first");
    if (!selectedTracking) return alert("Select a tracking link");
    if (!offerId) return alert("Select an offer");

    const offer = offers.find((o) => Number(o.id) === Number(offerId));
    const track = meta.find((m) => Number(m.tracking_link_id) === Number(selectedTracking));
    if (!offer || !track) return alert("Invalid offer or tracking");

    // Remaining validation (server also enforces)
    const sum = rules
      .filter((r) => r.pub_id === publisherDetails.pub_code && Number(r.tracking_link_id) === Number(selectedTracking))
      .reduce((s, x) => s + Number(x.weight || 0), 0);
    if (!isEditing && sum + Number(weight) > 100) {
      return alert("Weight exceeds remaining percentage for this tracking link");
    }

    const payload = {
      pub_id: publisherDetails.pub_code,
      publisher_id: publisherDetails.publisher_id,
      publisher_name: publisherDetails.publisher_name,

      tracking_link_id: Number(selectedTracking),
      geo: track.geo,
      carrier: track.carrier,

      offer_id: Number(offer.id),
      offer_code: offer.offer_id,
      offer_name: offer.offer_name,
      advertiser_name: offer.advertiser_name,

      redirect_url: offer.tracking_url || track.tracking_url || null,
      type: offer.type || track.type || null,
      weight: Number(weight),
      created_by: 1,
    };

    try {
      if (isEditing && editId) {
        await apiClient.put(`/distribution/rules/${editId}`, payload);
      } else {
        await apiClient.post("/distribution/rules", payload);
      }
      // refresh rules / offers / remaining
      await loadRules(publisherDetails.pub_code);
      await loadOffers(selectedTracking);
      await loadRemaining(publisherDetails.pub_code, selectedTracking);
      resetForm();
      // also refresh global overview
      loadOverview();
    } catch (err) {
      if (err.response?.status === 409) {
        return alert("That offer is already assigned for this pub & tracking link.");
      }
      console.error("save rule failed", err);
      alert("Failed to save rule");
    }
  };

  const beginEdit = (r) => {
    setIsEditing(true);
    setEditId(r.id);
    setSelectedTracking(r.tracking_link_id);
    setOfferId(r.offer_id);
    setWeight(r.weight || 100);
    // ensure offers list loaded for this tracking
    loadOffers(r.tracking_link_id);
  };

  const removeRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      if (publisherDetails) {
        await loadRules(publisherDetails.pub_code);
        await loadOffers(selectedTracking);
        await loadRemaining(publisherDetails.pub_code, selectedTracking);
      }
      loadOverview();
    } catch (err) {
      console.error("delete failed", err);
      alert("Failed to delete");
    }
  };

  /* ============================
     SEARCH / FILTERS (live)
  ============================ */
  const filteredOverview = useMemo(() => {
    const term = (search || "").trim().toLowerCase();
    if (!term) return overview;
    return overview.filter((r) => {
      return (
        (r.pub_id || "").toString().toLowerCase().includes(term) ||
        (r.offer_code || "").toLowerCase().includes(term) ||
        (r.offer_name || "").toLowerCase().includes(term) ||
        (r.advertiser_name || "").toLowerCase().includes(term) ||
        (r.publisher_name || "").toLowerCase().includes(term)
      );
    });
  }, [overview, search]);

  /* ============================
     BUILD publisher-facing click URL helper
     (you can append click_id dynamically)
  ============================ */
  const buildPublisherUrl = (pub_id, geo, carrier, clickIdPlaceholder = "{click_id}") => {
    // preferred published format: /click?pub_id=PUB03&geo=BD&carrier=Robi
    // your server redirects /click -> /api/distribution/click; both should work
    const base = `${window.location.origin.replace("dashboard.", "backend.")}/click`;
    // if your backend expects /api/distribution/click, replace accordingly:
    // const base = `${window.location.origin.replace("dashboard.", "backend.")}/api/distribution/click`;
    const q = `pub_id=${encodeURIComponent(pub_id)}&geo=${encodeURIComponent(geo)}&carrier=${encodeURIComponent(carrier)}`;
    return `${base}?${q}${clickIdPlaceholder ? `&click_id=${clickIdPlaceholder}` : ""}`;
  };

  /* ============================
     RENDER
  ============================ */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Traffic Distribution (Single Page)</h1>

      {/* PUB loader */}
      <div className="flex gap-3 mb-4">
        <input
          className="border p-2 rounded w-64"
          placeholder="Enter PUB_ID (e.g. PUB03)"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={loadMeta} disabled={loadingMeta}>
          {loadingMeta ? "Loading..." : "Load Publisher"}
        </button>

        <button className="bg-gray-700 text-white px-4 py-2 rounded" onClick={loadOverview} disabled={loadingOverview}>
          {loadingOverview ? "Loading..." : "Load Overview"}
        </button>

        <div className="ml-auto text-sm text-gray-600">
          Overview rows: <strong>{overview.length}</strong>
        </div>
      </div>

      {/* Publisher info */}
      {publisherDetails ? (
        <div className="bg-gray-50 p-4 rounded shadow mb-5">
          <div className="flex items-center justify-between">
            <div>
              <div><strong>PUB:</strong> {publisherDetails.pub_code}</div>
              <div><strong>Publisher:</strong> {publisherDetails.publisher_name}</div>
              <div className="text-sm text-gray-500">Combos: {publisherDetails.combos}</div>
            </div>

            <div className="text-right">
              <div className="text-sm">Remaining % (selected tracking): <strong>{remaining}%</strong></div>
              {/* sample publisher url for first combo if present */}
              {meta.length > 0 && (
                <div className="text-xs mt-2">
                  Give publisher this sample URL:
                  <div className="mt-1 font-mono text-xs bg-white p-2 rounded">
                    {buildPublisherUrl(publisherDetails.pub_code, meta[0]?.geo || "XX", meta[0]?.carrier || "YYY", "{click_id}")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 mb-5">Load a PUB_ID to configure distribution rules.</div>
      )}

      {/* CONFIGURE RULE */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Assign Offer to Tracking</h2>

        <div className="flex gap-3 items-center">
          <select
            className="border p-2 rounded w-1/4"
            value={selectedTracking || ""}
            onChange={(e) => setSelectedTracking(Number(e.target.value) || "")}
          >
            <option value="">Select tracking link</option>
            {meta.map((m) => (
              <option key={m.tracking_link_id} value={m.tracking_link_id}>
                {m.pub_code} • {m.geo || "-"} / {m.carrier || "-"} • {m.type || "-"}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded w-1/3"
            value={offerId || ""}
            onChange={(e) => setOfferId(Number(e.target.value) || "")}
            disabled={loadingOffers}
          >
            <option value="">Select Offer</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.offer_id} — {o.offer_name} ({o.advertiser_name})
              </option>
            ))}
          </select>

          <input
            type="number"
            className="border p-2 rounded w-20"
            min="1"
            max="100"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
          />

          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={addOrUpdateRule}>
            {isEditing ? "Update Rule" : "Add Rule"}
          </button>

          <button className="ml-2 px-3 py-2 rounded border" onClick={resetForm}>Reset</button>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Remaining % for this tracking link: <strong>{remaining}%</strong>
        </div>
      </div>

      {/* CURRENT RULES (for this PUB) */}
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Current Rules {publisherDetails ? `for ${publisherDetails.pub_code}` : ""}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Offer</th>
                <th className="p-2">Geo</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">Type</th>
                <th className="p-2">Weight</th>
                <th className="p-2">Redirect</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">No rules configured</td></tr>
              )}
              {rules.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.offer_code} — {r.offer_name}</td>
                  <td className="p-2">{r.geo}</td>
                  <td className="p-2">{r.carrier}</td>
                  <td className="p-2">{r.type}</td>
                  <td className="p-2">{r.weight}%</td>
                  <td className="p-2 truncate max-w-xs"><a className="text-blue-600" href={r.redirect_url} target="_blank" rel="noreferrer">{r.redirect_url}</a></td>
                  <td className="p-2">
                    <button className="bg-yellow-500 text-white px-2 py-1 rounded mr-2" onClick={() => beginEdit(r)}>Edit</button>
                    <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => removeRule(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GLOBAL OVERVIEW + LIVE SEARCH */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Global Distribution Overview</h2>
          <div className="text-sm text-gray-500">{loadingOverview ? "Loading..." : `${overview.length} rows`}</div>
        </div>

        <input
          placeholder="Search (PUB, offer code, offer name, advertiser, publisher)..."
          className="border p-2 rounded w-full mb-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">PUB</th>
                <th className="p-2">Publisher</th>
                <th className="p-2">Offer</th>
                <th className="p-2">Advertiser</th>
                <th className="p-2">Geo</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">Weight</th>
                <th className="p-2">Sample Click URL</th>
              </tr>
            </thead>
            <tbody>
              {filteredOverview.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-gray-500">No matching rows</td></tr>
              )}
              {filteredOverview.map((r) => (
                <tr key={`${r.pub_id}-${r.id}`} className="border-t">
                  <td className="p-2">{r.pub_id}</td>
                  <td className="p-2">{r.publisher_name}</td>
                  <td className="p-2">{r.offer_code}</td>
                  <td className="p-2">{r.advertiser_name}</td>
                  <td className="p-2">{r.geo}</td>
                  <td className="p-2">{r.carrier}</td>
                  <td className="p-2">{r.weight}%</td>
                  <td className="p-2">
                    <div className="font-mono text-xs break-all">
                      {buildPublisherUrl(r.pub_id, r.geo || "XX", r.carrier || "YYY", "{click_id}")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
