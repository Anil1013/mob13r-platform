import { useEffect, useState } from "react";
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
    apiFetch("/api/advertisers").then(setAdvertisers).catch(console.error);
    apiFetch("/api/offers").then(setOffers).catch(() => {});

    if (offer) {
      setForm({
        ...emptyOffer,
        ...offer,
        api_steps: offer.api_steps || {},
      });
    } else {
      const steps = {};
      Object.entries(OFFER_API_SCHEMA).forEach(([k, cfg]) => {
        steps[k] = { ...cfg.default };
      });
      setForm((f) => ({ ...f, api_steps: steps }));
    }
  }, [offer]);

  /* ================= BASIC SETTERS ================= */
  const set = (k, v) => setForm({ ...form, [k]: v });

  const setStep = (step, key, val) => {
    setForm({
      ...form,
      api_steps: {
        ...form.api_steps,
        [step]: {
          ...form.api_steps[step],
          [key]: val,
        },
      },
    });
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

  /* ================= SAVE ================= */
  const save = async () => {
    const payload = {
      ...form,
      payout: Number(form.payout || 0),
      revenue: Number(form.revenue || 0),
      daily_cap: Number(form.daily_cap || 0),
    };

    if (offer?.id) {
      await apiFetch(`/api/offers/${offer.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/offers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    onSaved?.();
  };

  /* ================= UI ================= */
  return (
    <div className="card p-4 space-y-6">
      <h2 className="text-xl font-bold">
        {offer ? "Edit Offer" : "Create Offer"}
      </h2>

      {/* BASIC INFO */}
      <div className="grid grid-cols-2 gap-4">
        <select
          value={form.advertiser_id}
          onChange={(e) => set("advertiser_id", e.target.value)}
        >
          <option value="">Select Advertiser</option>
          {advertisers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Offer Name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />

        <input
          placeholder="Geo"
          value={form.geo}
          onChange={(e) => set("geo", e.target.value)}
        />

        <input
          placeholder="Carrier"
          value={form.carrier}
          onChange={(e) => set("carrier", e.target.value)}
        />

        <input
          type="number"
          placeholder="Payout"
          value={form.payout}
          onChange={(e) => set("payout", e.target.value)}
        />

        <input
          type="number"
          placeholder="Revenue"
          value={form.revenue}
          onChange={(e) => set("revenue", e.target.value)}
        />

        <input
          type="number"
          placeholder="Daily Cap"
          value={form.daily_cap}
          onChange={(e) => set("daily_cap", e.target.value)}
        />

        <select
          value={form.fallback_offer_id}
          onChange={(e) => set("fallback_offer_id", e.target.value)}
        >
          <option value="">Fallback Offer (Optional)</option>
          {offers
            .filter((o) => o.id !== offer?.id)
            .map((o) => (
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

      {/* API STEPS */}
      {Object.entries(OFFER_API_SCHEMA).map(([step, cfg]) => {
        const data = form.api_steps[step] || {};
        return (
          <div key={step} className="border rounded p-4 space-y-3">
            <div className="flex justify-between">
              <h3 className="font-semibold">{cfg.label}</h3>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={data.enabled}
                  onChange={(e) =>
                    setStep(step, "enabled", e.target.checked)
                  }
                />
                Enabled
              </label>
            </div>

            <div className="flex gap-2">
              <select
                value={data.method}
                onChange={(e) =>
                  setStep(step, "method", e.target.value)
                }
              >
                <option>GET</option>
                <option>POST</option>
              </select>

              <input
                className="flex-1"
                placeholder="Full API URL"
                value={data.url}
                onChange={(e) =>
                  setStep(step, "url", e.target.value)
                }
              />
            </div>

            <Section
              title="Headers"
              step={step}
              type="headers"
              data={data}
              templates={cfg.templates}
              addKV={addKV}
              updateKV={updateKV}
              removeKV={removeKV}
            />

            <Section
              title="Params / Body"
              step={step}
              type="params"
              data={data}
              templates={cfg.templates}
              addKV={addKV}
              updateKV={updateKV}
              removeKV={removeKV}
            />

            <input
              placeholder='Success Matcher (e.g. "status":1)'
              value={data.success_matcher || ""}
              onChange={(e) =>
                setStep(step, "success_matcher", e.target.value)
              }
            />

            {offer?.id && data.enabled && (
              <button
                className="btn btn-success"
                onClick={() => setTestStep(step)}
              >
                🔴 Live API Test
              </button>
            )}
          </div>
        );
      })}

      <button className="btn btn-primary" onClick={save}>
        Save Offer
      </button>

      {testStep && (
        <LiveApiTestModal
          open
          step={testStep}
          offerId={offer.id}
          onClose={() => setTestStep(null)}
        />
      )}
    </div>
  );
}

/* ================= SUB COMPONENT ================= */
function Section({
  title,
  step,
  type,
  data,
  templates,
  addKV,
  updateKV,
  removeKV,
}) {
  const obj = data[type] || {};
  return (
    <div>
      <h4 className="font-medium">{title}</h4>

      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex gap-2 mb-1">
          <input
            className="w-1/3"
            value={k}
            onChange={(e) =>
              updateKV(step, type, e.target.value, v, k)
            }
          />
          <input
            className="flex-1"
            value={v}
            onChange={(e) =>
              updateKV(step, type, k, e.target.value, k)
            }
          />
          <button onClick={() => removeKV(step, type, k)}>✕</button>
        </div>
      ))}

      <button onClick={() => addKV(step, type)}>
        + Add {title}
      </button>

      <div className="text-xs text-gray-500 mt-1">
        Templates: {templates.map((t) => `<coll_${t}>`).join(", ")}
      </div>
    </div>
  );
}
