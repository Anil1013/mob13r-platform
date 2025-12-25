import { useEffect, useState } from "react";
import { getAdvertisers } from "../../services/advertisers";

/* ================= DEFAULT ================= */
const DEFAULT_OFFER = {
  name: "",
  advertiser_id: "",
  geo: "",
  carrier: "",

  payout: "",
  revenue: "",
  cap: "",

  is_active: true,
  api_mode: "POST",

  status_check_url: "",
  status_check_params: [],

  pin_send_url: "",
  pin_send_params: [],

  pin_verify_url: "",
  pin_verify_params: [],

  redirect_url: "",

  step_status_check: true,
  step_pin_send: true,
  step_pin_verify: true,

  fraud_enabled: false,
  fraud_partner: "",
  fraud_service: "",
};

/* ================= PARAM TEMPLATES ================= */
const PARAM_TEMPLATES = [
  "msisdn",
  "ip",
  "user_ip",
  "ua",
  "pub_id",
  "sub_pub_id",
  "pin",
  "sessionKey",
];

export default function OfferForm({ onClose, onSave, initialData }) {
  const [advertisers, setAdvertisers] = useState([]);
  const [offer, setOffer] = useState(DEFAULT_OFFER);
  const [errors, setErrors] = useState({});
  const [testing, setTesting] = useState(null);

  /* ================= LOAD ADVERTISERS ================= */
  useEffect(() => {
    getAdvertisers().then((res) => setAdvertisers(res || []));
  }, []);

  /* ================= LOAD EDIT ================= */
  useEffect(() => {
    if (!initialData) {
      setOffer(DEFAULT_OFFER);
      return;
    }

    setOffer({
      ...DEFAULT_OFFER,
      ...initialData,

      payout: initialData.payout ?? "",
      revenue: initialData.revenue ?? "",
      cap: initialData.cap ?? "",

      status_check_params: toArray(initialData.status_check_params),
      pin_send_params: toArray(initialData.pin_send_params),
      pin_verify_params: toArray(initialData.pin_verify_params),

      step_status_check: initialData.steps?.status_check ?? true,
      step_pin_send: initialData.steps?.pin_send ?? true,
      step_pin_verify: initialData.steps?.pin_verify ?? true,
    });
  }, [initialData]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOffer((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* ================= VALIDATION ================= */
  const validate = () => {
    const e = {};

    if (!offer.name) e.name = "Offer name required";
    if (!offer.advertiser_id) e.advertiser_id = "Advertiser required";

    if (offer.payout < 0) e.payout = "Invalid payout";
    if (offer.revenue < 0) e.revenue = "Invalid revenue";
    if (offer.cap < 0) e.cap = "Invalid cap";

    if (offer.status_check_url && !isValidUrl(offer.status_check_url))
      e.status_check_url = "Invalid URL";

    if (offer.pin_send_url && !isValidUrl(offer.pin_send_url))
      e.pin_send_url = "Invalid URL";

    if (offer.pin_verify_url && !isValidUrl(offer.pin_verify_url))
      e.pin_verify_url = "Invalid URL";

    if (
      !offer.step_status_check &&
      !offer.step_pin_send &&
      !offer.step_pin_verify
    ) {
      e.steps = "Enable at least one step";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...offer,

      payout: Number(offer.payout || 0),
      revenue: Number(offer.revenue || 0),
      cap: offer.cap === "" ? null : Number(offer.cap),

      steps: {
        status_check: offer.step_status_check,
        pin_send: offer.step_pin_send,
        pin_verify: offer.step_pin_verify,
      },

      redirect_url: offer.redirect_url || null,
    });
  };

  /* ================= API TEST ================= */
  const testApi = async (url, params) => {
    if (!url) return alert("URL missing");
    setTesting(url);

    try {
      const qs = params.map((p) => `${p}=test`).join("&");
      const res = await fetch(`${url}?${qs}`);
      const text = await res.text();
      alert(`✅ SUCCESS\n\n${text.slice(0, 500)}`);
    } catch (err) {
      alert(`❌ ERROR\n\n${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.heading}>
          {initialData ? "Edit Offer" : "Create Offer"}
        </h2>

        {/* ================= BASIC ================= */}
        <Section title="Basic Information">
          <Input label="Offer Name" name="name" value={offer.name} onChange={handleChange} error={errors.name} />

          <Select
            label="Advertiser"
            name="advertiser_id"
            value={offer.advertiser_id}
            onChange={handleChange}
            options={advertisers}
            error={errors.advertiser_id}
          />

          <Row>
            <Input label="Geo" name="geo" value={offer.geo} onChange={handleChange} />
            <Input label="Carrier" name="carrier" value={offer.carrier} onChange={handleChange} />
          </Row>

          <Row>
            <Input label="Payout" name="payout" value={offer.payout} onChange={handleChange} error={errors.payout} />
            <Input label="Revenue" name="revenue" value={offer.revenue} onChange={handleChange} error={errors.revenue} />
            <Input label="Daily Cap" name="cap" value={offer.cap} onChange={handleChange} error={errors.cap} />
          </Row>
        </Section>

        {/* ================= STATUS CHECK ================= */}
        <ApiSection
          title="Status Check API"
          urlName="status_check_url"
          url={offer.status_check_url}
          params={offer.status_check_params}
          onUrlChange={handleChange}
          onParamsChange={(v) => setOffer((p) => ({ ...p, status_check_params: v }))}
          onTest={() => testApi(offer.status_check_url, offer.status_check_params)}
          testing={testing === offer.status_check_url}
        />

        {/* ================= PIN SEND ================= */}
        <ApiSection
          title="PIN Send API"
          urlName="pin_send_url"
          url={offer.pin_send_url}
          params={offer.pin_send_params}
          onUrlChange={handleChange}
          onParamsChange={(v) => setOffer((p) => ({ ...p, pin_send_params: v }))}
          onTest={() => testApi(offer.pin_send_url, offer.pin_send_params)}
          testing={testing === offer.pin_send_url}
        />

        {/* ================= PIN VERIFY ================= */}
        <ApiSection
          title="PIN Verify API"
          urlName="pin_verify_url"
          url={offer.pin_verify_url}
          params={offer.pin_verify_params}
          onUrlChange={handleChange}
          onParamsChange={(v) => setOffer((p) => ({ ...p, pin_verify_params: v }))}
          onTest={() => testApi(offer.pin_verify_url, offer.pin_verify_params)}
          testing={testing === offer.pin_verify_url}
        />

        {/* ================= ACTIONS ================= */}
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.cancel}>
            Cancel
          </button>
          <button type="submit" style={styles.save}>
            {initialData ? "Update Offer" : "Save Offer"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= API SECTION ================= */
const ApiSection = ({ title, url, urlName, params, onUrlChange, onParamsChange, onTest, testing }) => (
  <Section title={title}>
    <Input label="URL" name={urlName} value={url} onChange={onUrlChange} />
    <ParamBuilder values={params} onChange={onParamsChange} />
    <button type="button" onClick={onTest} disabled={testing} style={styles.testBtn}>
      {testing ? "Testing..." : "Test API"}
    </button>
  </Section>
);

/* ================= PARAM BUILDER ================= */
const ParamBuilder = ({ values = [], onChange }) => {
  const [input, setInput] = useState("");

  const add = (v) => {
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
  };

  return (
    <>
      <div style={styles.templateRow}>
        {PARAM_TEMPLATES.map((t) => (
          <span key={t} style={styles.template} onClick={() => add(t)}>
            + {t}
          </span>
        ))}
      </div>

      <div style={styles.chips}>
        {values.map((p) => (
          <span key={p} style={styles.chip} onClick={() => onChange(values.filter((x) => x !== p))}>
            {p} ✕
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input.trim());
              setInput("");
            }
          }}
          placeholder="type & press enter"
          style={styles.chipInput}
        />
      </div>
    </>
  );
};

/* ================= HELPERS ================= */
const toArray = (v) =>
  Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map((x) => x.trim()) : [];

const isValidUrl = (v) => {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
};

/* ================= UI ================= */
const Section = ({ title, children }) => (
  <div style={styles.section}>
    <h4 style={styles.sectionTitle}>{title}</h4>
    {children}
  </div>
);

const Input = ({ label, error, ...p }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    <input {...p} style={styles.input} />
    {error && <div style={styles.error}>{error}</div>}
  </div>
);

const Select = ({ label, options, error, ...p }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    <select {...p} style={styles.select}>
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
    {error && <div style={styles.error}>{error}</div>}
  </div>
);

const Row = ({ children }) => <div style={styles.row}>{children}</div>;

/* ================= STYLES ================= */
const styles = {
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:50},
  card:{width:820,maxHeight:"90vh",overflowY:"auto",background:"#020617",padding:28,borderRadius:14,color:"#fff"},
  heading:{textAlign:"center",marginBottom:20},
  section:{marginBottom:22},
  sectionTitle:{color:"#38bdf8",fontSize:14,marginBottom:10},
  inputGroup:{marginBottom:10},
  label:{fontSize:12,color:"#94a3b8"},
  input:{padding:10,borderRadius:8,border:"1px solid #1e293b",background:"#020617",color:"#fff"},
  select:{padding:10,borderRadius:8,border:"1px solid #1e293b",background:"#020617",color:"#fff"},
  row:{display:"flex",gap:12},
  chips:{display:"flex",flexWrap:"wrap",gap:6,border:"1px solid #1e293b",padding:6,borderRadius:8},
  chip:{background:"#1e293b",padding:"4px 8px",borderRadius:6,fontSize:12,cursor:"pointer"},
  chipInput:{flex:1,minWidth:120,background:"transparent",border:"none",color:"#fff",outline:"none"},
  templateRow:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6},
  template:{fontSize:11,color:"#38bdf8",cursor:"pointer"},
  testBtn:{marginTop:8,background:"#0ea5e9",border:"none",padding:"6px 12px",borderRadius:6,color:"#fff"},
  actions:{display:"flex",justifyContent:"space-between"},
  cancel:{background:"#334155",padding:"10px 18px",borderRadius:8,color:"#fff"},
  save:{background:"#16a34a",padding:"10px 18px",borderRadius:8,color:"#fff"},
  error:{color:"#f87171",fontSize:11,marginTop:4},
};
