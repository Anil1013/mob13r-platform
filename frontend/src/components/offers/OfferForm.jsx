import { useEffect, useState } from "react";
import axios from "../../utils/axios";
import { OFFER_API_SCHEMA } from "../../config/offerApiSchema";

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  /* ================= INIT ================= */
  useEffect(() => {
    axios.get("/advertisers").then((res) => setAdvertisers(res.data));

    if (offer) {
      setForm({
        ...emptyOffer,
        ...offer,
        api_steps: offer.api_steps || {},
      });
    } else {
      // initialize api_steps from schema
      const steps = {};
      Object.entries(OFFER_API_SCHEMA).forEach(([key, cfg]) => {
        steps[key] = { ...cfg.default };
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
      payout: Number(form.payout),
      revenue: Number(form.revenue),
    };

    if (offer?.id) {
      await axios.put(`/offers/${offer.id}`, payload);
    } else {
      await axios.post("/offers", payload);
    }

    onSaved?.();
  };

  /* ================= TEST STEP ================= */
  const testStep = async (step) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axios.post(
        `/offers/${offer.id}/${step}`,
        {
          msisdn: "966500000000",
          pin: "1234",
          param1: "test",
        }
      );
      setTestResult(res.data);
    } catch (e) {
      setTestResult(e.response?.data || { error: "Failed" });
    }
    setTesting(false);
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
          placeholder="Payout"
          type="number"
          value={form.payout}
          onChange={(e) => set("payout", e.target.value)}
        />

        <input
          placeholder="Revenue"
          type="number"
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

      {/* API STEPS */}
      {Object.entries(OFFER_API_SCHEMA).map(([step, cfg]) => {
        const data = form.api_steps[step] || {};
        return (
          <div key={step} className="border rounded p-3 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{cfg.label}</h3>
              <label>
                <input
                  type="checkbox"
                  checked={data.enabled}
                  onChange={(e) => setStep(step, "enabled", e.target.checked)}
                />{" "}
                Enabled
              </label>
            </div>

            <select
              value={data.method}
              onChange={(e) => setStep(step, "method", e.target.value)}
            >
              <option>GET</option>
              <option>POST</option>
            </select>

            <input
              placeholder="API URL"
              value={data.url}
              onChange={(e) => setStep(step, "url", e.target.value)}
            />

            {/* PARAMS */}
            <Section
              title="Params"
              step={step}
              type="params"
              data={data}
              templates={cfg.templates}
              addKV={addKV}
              updateKV={updateKV}
              removeKV={removeKV}
            />

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

            <input
              placeholder="Success Matcher (string)"
              value={data.success_matcher || ""}
              onChange={(e) =>
                setStep(step, "success_matcher", e.target.value)
              }
            />

            {offer && (
              <button
                className="btn btn-secondary"
                disabled={testing}
                onClick={() => testStep(step)}
              >
                {testing ? "Testing..." : "Test API"}
              </button>
            )}
          </div>
        );
      })}

      {/* TEST RESULT */}
      {testResult && (
        <pre className="bg-black text-green-400 p-3 text-xs overflow-auto">
          {JSON.stringify(testResult, null, 2)}
        </pre>
      )}

      <button className="btn btn-primary" onClick={save}>
        Save Offer
      </button>
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
      <button onClick={() => addKV(step, type)}>+ Add {title}</button>

      <div className="text-xs text-gray-500 mt-1">
        Templates: {templates.map((t) => `<coll_${t}>`).join(", ")}
      </div>
    </div>
  );
}
