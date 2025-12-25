import { useEffect, useState } from "react";
import { OFFER_API_SCHEMA } from "../../config/offerApiSchema";
import LiveApiTestModal from "../LiveApiTestModal";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

/* ================= DEFAULT ================= */
const emptyOffer = {
  advertiser_id: "",
  name: "",
  geo: "",
  carrier: "",
  payout: "",
  revenue: "",
  cap: "",
  redirect_url: "",
  is_active: true,
  api_steps: {},
  fallback_rules: [],
};

export default function OfferForm({ offer, onSaved }) {
  const [form, setForm] = useState(emptyOffer);
  const [advertisers, setAdvertisers] = useState([]);
  const [testStep, setTestStep] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    fetch(`${API_BASE}/advertisers`, auth())
      .then((r) => r.json())
      .then(setAdvertisers);

    if (offer) {
      setForm({
        ...emptyOffer,
        ...offer,
        api_steps: offer.api_steps || {},
        fallback_rules: offer.fallback_rules || [],
      });
    } else {
      const steps = {};
      Object.entries(OFFER_API_SCHEMA).forEach(([k, cfg]) => {
        steps[k] = { ...cfg.default };
      });
      setForm((f) => ({ ...f, api_steps: steps }));
    }
  }, [offer]);

  /* ================= BASIC ================= */
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

  /* ================= KV BUILDER ================= */
  const addKV = (step, type) =>
    setStep(step, type, {
      ...(form.api_steps[step][type] || {}),
      "": "",
    });

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

  /* ================= FALLBACK ================= */
  const addFallback = () =>
    setForm({
      ...form,
      fallback_rules: [
        ...form.fallback_rules,
        { geo: "", carrier: "", fallback_offer_id: "" },
      ],
    });

  const updateFallback = (i, k, v) => {
    const rules = [...form.fallback_rules];
    rules[i][k] = v;
    setForm({ ...form, fallback_rules: rules });
  };

  const removeFallback = (i) => {
    const rules = [...form.fallback_rules];
    rules.splice(i, 1);
    setForm({ ...form, fallback_rules: rules });
  };

  /* ================= SAVE ================= */
  const save = async () => {
    const payload = {
      ...form,
      payout: Number(form.payout),
      revenue: Number(form.revenue),
      cap: Number(form.cap || 0),
    };

    await fetch(
      offer?.id
        ? `${API_BASE}/offers/${offer.id}`
        : `${API_BASE}/offers`,
      {
        method: offer?.id ? "PUT" : "POST",
        ...auth(),
        body: JSON.stringify(payload),
      }
    );

    onSaved?.();
  };

  /* ================= UI ================= */
  return (
    <div className="card p-4 space-y-6">
      <h2 className="text-xl font-bold">
        {offer ? "Edit Offer" : "Create Offer"}
      </h2>

      {/* BASIC */}
      <div className="grid grid-cols-2 gap-3">
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
          value={form.cap}
          onChange={(e) => set("cap", e.target.value)}
        />

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
              <input
                type="checkbox"
                checked={data.enabled}
                onChange={(e) =>
                  setStep(step, "enabled", e.target.checked)
                }
              />
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
                placeholder="API URL"
                value={data.url}
                onChange={(e) =>
                  setStep(step, "url", e.target.value)
                }
              />
            </div>

            <KVSection
              title="Headers"
              step={step}
              type="headers"
              data={data}
              templates={cfg.templates}
              addKV={addKV}
              updateKV={updateKV}
              removeKV={removeKV}
            />

            <KVSection
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

      {/* FALLBACK */}
      <div className="border rounded p-4 space-y-2">
        <h3 className="font-semibold text-yellow-400">
          Fallback Offers (After Cap)
        </h3>

        {form.fallback_rules.map((r, i) => (
          <div key={i} className="grid grid-cols-4 gap-2">
            <input
              placeholder="Geo"
              value={r.geo}
              onChange={(e) =>
                updateFallback(i, "geo", e.target.value)
              }
            />
            <input
              placeholder="Carrier"
              value={r.carrier}
              onChange={(e) =>
                updateFallback(i, "carrier", e.target.value)
              }
            />
            <input
              placeholder="Fallback Offer ID"
              value={r.fallback_offer_id}
              onChange={(e) =>
                updateFallback(
                  i,
                  "fallback_offer_id",
                  e.target.value
                )
              }
            />
            <button
              className="btn btn-danger"
              onClick={() => removeFallback(i)}
            >
              ✕
            </button>
          </div>
        ))}

        <button className="btn btn-secondary" onClick={addFallback}>
          + Add Fallback
        </button>
      </div>

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

/* ================= SUB ================= */
function KVSection({
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
        <div key={k} className="flex gap-2">
          <input
            value={k}
            placeholder="key"
            onChange={(e) =>
              updateKV(step, type, e.target.value, v, k)
            }
          />
          <input
            value={v}
            placeholder="value"
            onChange={(e) =>
              updateKV(step, type, k, e.target.value, k)
            }
          />
          <button onClick={() => removeKV(step, type, k)}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => addKV(step, type)}>
        + Add {title}
      </button>
      <div className="text-xs opacity-60">
        Templates: {templates.map((t) => `<coll_${t}>`).join(", ")}
      </div>
    </div>
  );
}

/* ================= AUTH ================= */
const auth = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  },
});
