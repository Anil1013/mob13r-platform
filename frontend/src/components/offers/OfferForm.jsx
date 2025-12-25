import { useEffect, useState } from "react";
import axiosLib from "axios";
import { OFFER_API_SCHEMA } from "../../config/offerApiSchema";
import LiveApiTestModal from "../LiveApiTestModal";

/* ================= AXIOS INSTANCE ================= */
const axios = axiosLib.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com",
});

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ================= DEFAULT ================= */
const emptyOffer = {
  advertiser_id: "",
  name: "",
  geo: "",
  carrier: "",
  payout: "",
  revenue: "",
  api_steps: {},
  redirect_url: "",
  is_active: true,
};

export default function OfferForm({ offer, onSaved }) {
  const [form, setForm] = useState(emptyOffer);
  const [advertisers, setAdvertisers] = useState([]);
  const [testStep, setTestStep] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    axios.get("/api/advertisers").then((res) => {
      setAdvertisers(res.data || []);
    });

    if (offer) {
      setForm({
        ...emptyOffer,
        ...offer,
        api_steps: offer.api_steps || {},
      });
    } else {
      const steps = {};
      Object.entries(OFFER_API_SCHEMA).forEach(([key, cfg]) => {
        steps[key] = { ...cfg.default };
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

  /* ================= PARAM / HEADER BUILDER ================= */
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
    };

    if (offer?.id) {
      await axios.put(`/api/offers/${offer.id}`, payload);
    } else {
      await axios.post("/api/offers", payload);
    }

    onSaved?.();
  };

  /* ================= UI ================= */
  return (
    <div className="card p-4 space-y-6">
      <h2 className="text-xl font-bold">
        {offer ? "Edit Offer" : "Create Offer"}
      </h2>

      {/* ================= BASIC INFO ================= */}
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
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{cfg.label}</h3>
              <label className="flex gap-2 items-center">
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
                placeholder="API URL"
                value={data.url}
                onChange={(e) =>
                  setStep(step, "url", e.target.value)
                }
              />
            </div>

            {/* HEADERS */}
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

            {/* PARAMS */}
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

            {/* LIVE TEST */}
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

      {/* ================= LIVE TEST MODAL ================= */}
      {testStep && (
        <LiveApiTestModal
          open={!!testStep}
          step={testStep}
          offerId={offer.id}
          authToken={localStorage.getItem("token")}
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
      <h4 className="font-medium mb-1">{title}</h4>

      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex gap-2 mb-1">
          <input
            placeholder="key"
            value={k}
            onChange={(e) =>
              updateKV(step, type, e.target.value, v, k)
            }
          />
          <input
            placeholder="value"
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
