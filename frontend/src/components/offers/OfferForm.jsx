import { useEffect, useMemo, useState } from "react";
import { OFFER_API_SCHEMA } from "../../config/offerApiSchema";
import LiveApiTestModal from "../LiveApiTestModal";

/* ================= API BASE ================= */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

/* ================= FETCH HELPER ================= */
const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "API Error");
  }

  return res.json();
};

/* ================= DEFAULT OFFER ================= */
const emptyOffer = {
  advertiser_id: "",
  name: "",
  geo: "",
  carrier: "",
  payout: "",
  revenue: "",
  daily_cap: "",
  redirect_url: "",
  fallback_offer_id: "",
  api_steps: {},
  is_active: true,
};

export default function OfferForm({ offer, onSaved }) {
  const [form, setForm] = useState(emptyOffer);
  const [advertisers, setAdvertisers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [testStep, setTestStep] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    apiFetch("/api/advertisers").then(setAdvertisers);
    apiFetch("/api/offers").then(setOffers).catch(() => {});

    if (offer) {
      // 🔁 AUTO-PREFILL FROM DB
      const normalizedSteps = {};
      Object.entries(offer.api_steps || {}).forEach(([k, s]) => {
        normalizedSteps[k] = {
          enabled: !!s.enabled,
          method: s.method || "GET",
          url: s.url || "",
          headers: s.headers || {},
          params: s.params || {},
          success_matcher: s.success_matcher || "",
        };
      });

      setForm({
        ...emptyOffer,
        ...offer,
        api_steps: normalizedSteps,
      });
    } else {
      const steps = {};
      Object.entries(OFFER_API_SCHEMA).forEach(([k, cfg]) => {
        steps[k] = {
          enabled: false,
          method: "GET",
          url: "",
          headers: {},
          params: {},
          success_matcher: "",
          ...cfg.default,
        };
      });
      setForm((f) => ({ ...f, api_steps: steps }));
    }
  }, [offer]);

  /* ================= BASIC SETTERS ================= */
  const set = (k, v) => setForm({ ...form, [k]: v });

  const setStep = (step, key, val) => {
    setForm((prev) => ({
      ...prev,
      api_steps: {
        ...prev.api_steps,
        [step]: {
          ...prev.api_steps[step],
          [key]: val,
        },
      },
    }));
  };

  /* ================= PARAM BUILDER ================= */
  const addKV = (step, type) => {
    const obj = form.api_steps[step][type] || {};
    setStep(step, type, { ...obj, "": "" });
  };

  const updateKV = (step, type, k, v, oldKey) => {
    const obj = { ...(form.api_steps[step][type] || {}) };
    delete obj[oldKey];
    obj[k] = v;
    setStep(step, type, obj);
  };

  const removeKV = (step, type, k) => {
    const obj = { ...(form.api_steps[step][type] || {}) };
    delete obj[k];
    setStep(step, type, obj);
  };

  /* ================= 🔍 USED PARAMS DETECTOR ================= */
  const usedParams = useMemo(() => {
    const found = new Set();
    const regex = /<coll_[a-zA-Z0-9_]+>/g;

    Object.values(form.api_steps || {}).forEach((s) => {
      const scan = (val) => {
        if (!val) return;
        const text = typeof val === "string" ? val : JSON.stringify(val);
        (text.match(regex) || []).forEach((m) => found.add(m));
      };

      scan(s.url);
      scan(s.headers);
      scan(s.params);
    });

    return Array.from(found);
  }, [form.api_steps]);

  /* ================= SAVE ================= */
  const save = async () => {
    const cleanSteps = {};
    Object.entries(form.api_steps || {}).forEach(([k, s]) => {
      cleanSteps[k] = {
        enabled: !!s.enabled,
        method: s.method || "GET",
        url: s.url?.trim() || "",
        headers: s.headers || {},
        params: s.params || {},
        success_matcher: s.success_matcher || "",
      };
    });

    const payload = {
      ...form,
      payout: Number(form.payout || 0),
      revenue: Number(form.revenue || 0),
      daily_cap: Number(form.daily_cap || 0),
      api_steps: cleanSteps,
    };

    if (!payload.advertiser_id || !payload.name) {
      alert("Advertiser and Offer Name required");
      return;
    }

    await apiFetch(offer?.id ? `/api/offers/${offer.id}` : "/api/offers", {
      method: offer?.id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    onSaved?.();
  };

  /* ================= UI ================= */
  return (
    <div className="card p-4 space-y-6">
      <h2 className="text-xl font-bold">
        {offer ? "Edit Offer" : "Create Offer"}
      </h2>

      {/* ================= USED PARAMS ================= */}
      {usedParams.length > 0 && (
        <div className="bg-slate-900 p-3 rounded">
          <div className="text-sm font-semibold mb-1">
            📊 Used Params
          </div>
          <div className="flex flex-wrap gap-2">
            {usedParams.map((p) => (
              <span
                key={p}
                className="px-2 py-1 bg-blue-600 text-xs rounded"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ================= BASIC INFO ================= */}
      <div className="grid grid-cols-2 gap-4">
        <select value={form.advertiser_id} onChange={(e) => set("advertiser_id", e.target.value)}>
          <option value="">Select Advertiser</option>
          {advertisers.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <input placeholder="Offer Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <input placeholder="Geo" value={form.geo} onChange={(e) => set("geo", e.target.value)} />
        <input placeholder="Carrier" value={form.carrier} onChange={(e) => set("carrier", e.target.value)} />

        <input type="number" placeholder="Payout" value={form.payout} onChange={(e) => set("payout", e.target.value)} />
        <input type="number" placeholder="Revenue" value={form.revenue} onChange={(e) => set("revenue", e.target.value)} />
        <input type="number" placeholder="Daily Cap" value={form.daily_cap} onChange={(e) => set("daily_cap", e.target.value)} />

        <select value={form.fallback_offer_id} onChange={(e) => set("fallback_offer_id", e.target.value)}>
          <option value="">Fallback Offer (Cap Reached)</option>
          {offers.filter((o) => o.id !== offer?.id).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.geo}/{o.carrier})
            </option>
          ))}
        </select>

        <input
          className="col-span-2"
          placeholder="Redirect URL"
          value={form.redirect_url}
          onChange={(e) => set("redirect_url", e.target.value)}
        />
      </div>

      {/* ================= API STEPS ================= */}
      {Object.entries(OFFER_API_SCHEMA).map(([step, cfg]) => {
        const data = form.api_steps[step] || {};
        return (
          <div key={step} className="border rounded p-4 space-y-3">
            <div className="flex justify-between">
              <h3 className="font-semibold">{cfg.label}</h3>
              <input
                type="checkbox"
                checked={data.enabled}
                onChange={(e) => setStep(step, "enabled", e.target.checked)}
              />
            </div>

            <div className="flex gap-2 w-full">
              <select className="w-28" value={data.method} onChange={(e) => setStep(step, "method", e.target.value)}>
                <option>GET</option>
                <option>POST</option>
              </select>

              <input
                className="w-full font-mono text-sm"
                placeholder="https://full.api.url/endpoint"
                value={data.url}
                onChange={(e) => setStep(step, "url", e.target.value)}
              />
            </div>

            <Section title="Headers" step={step} type="headers" data={data} templates={cfg.templates}
              addKV={addKV} updateKV={updateKV} removeKV={removeKV} />

            <Section title="Params / Body" step={step} type="params" data={data} templates={cfg.templates}
              addKV={addKV} updateKV={updateKV} removeKV={removeKV} />

            <input
              placeholder='Success Matcher (e.g. "status":true)'
              value={data.success_matcher}
              onChange={(e) => setStep(step, "success_matcher", e.target.value)}
            />
          </div>
        );
      })}

      <button className="btn btn-primary" onClick={save}>
        Save Offer
      </button>

      {testStep && (
        <LiveApiTestModal open step={testStep} offerId={offer.id} onClose={() => setTestStep(null)} />
      )}
    </div>
  );
}

/* ================= SUB COMPONENT ================= */
function Section({ title, step, type, data, templates, addKV, updateKV, removeKV }) {
  const obj = data[type] || {};
  return (
    <div>
      <h4 className="font-medium">{title}</h4>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex gap-2 mb-1">
          <input value={k} onChange={(e) => updateKV(step, type, e.target.value, v, k)} />
          <input value={v} onChange={(e) => updateKV(step, type, k, e.target.value, k)} />
          <button onClick={() => removeKV(step, type, k)}>✕</button>
        </div>
      ))}
      <button onClick={() => addKV(step, type)}>+ Add {title}</button>
      <div className="text-xs text-gray-500 mt-1">
        Templates: {templates.map((t) => `<coll_${t}>`).join(", ")}
      </div>
    </div>
  );
}
