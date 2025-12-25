import { useEffect, useState } from "react";
import { getAdvertisers } from "../../services/advertisers";

/* ================= DEFAULT OFFER ================= */
const DEFAULT_OFFER = {
  /* BASIC */
  name: "",
  advertiser_id: "",
  geo: "",
  carrier: "",
  payout: "",
  revenue: "",
  is_active: true,

  /* API */
  api_mode: "POST",

  /* STATUS CHECK */
  status_check_url: "",
  status_check_params: "msisdn,user_ip,ip,ua",

  /* PIN SEND */
  pin_send_url: "",
  pin_send_params: "msisdn,user_ip,ip,ua,pub_id,sub_pub_id",

  /* PIN VERIFY */
  pin_verify_url: "",
  pin_verify_params: "msisdn,pin,user_ip,ip,ua,sessionKey",

  /* FLOW */
  redirect_url: "",
  step_status_check: true,
  step_pin_send: true,
  step_pin_verify: true,

  /* FRAUD */
  fraud_enabled: false,
  fraud_partner: "",
  fraud_service: "",
};

export default function OfferForm({ onClose, onSave, initialData }) {
  const [advertisers, setAdvertisers] = useState([]);
  const [offer, setOffer] = useState({ ...DEFAULT_OFFER, ...initialData });

  /* ================= LOAD ADVERTISERS ================= */
  useEffect(() => {
    getAdvertisers().then((data) => setAdvertisers(data || []));
  }, []);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOffer({ ...offer, [name]: type === "checkbox" ? checked : value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...offer,
      payout: Number(offer.payout),
      revenue: Number(offer.revenue),
      steps: {
        status_check: offer.step_status_check,
        pin_send: offer.step_pin_send,
        pin_verify: offer.step_pin_verify,
      },
      status_check_params: normalize(offer.status_check_params),
      pin_send_params: normalize(offer.pin_send_params),
      pin_verify_params: normalize(offer.pin_verify_params),
    });
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.heading}>
          {initialData ? "Edit Offer" : "Create Offer"}
        </h2>

        {/* ================= BASIC ================= */}
        <Section title="Basic Information">
          <Input label="Offer Name" name="name" value={offer.name} onChange={handleChange} required />

          <div style={styles.inputGroup}>
            <label style={styles.label}>Advertiser</label>
            <select
              name="advertiser_id"
              value={offer.advertiser_id}
              onChange={handleChange}
              style={styles.select}
              required
            >
              <option value="">Select advertiser</option>
              {advertisers.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <Row>
            <Input label="Geo" name="geo" value={offer.geo} onChange={handleChange} />
            <Input label="Carrier" name="carrier" value={offer.carrier} onChange={handleChange} />
          </Row>

          <Row>
            <Input label="Payout" name="payout" value={offer.payout} onChange={handleChange} />
            <Input label="Revenue" name="revenue" value={offer.revenue} onChange={handleChange} />
          </Row>

          <label style={styles.checkbox}>
            <input type="checkbox" name="is_active" checked={offer.is_active} onChange={handleChange} />
            Offer Active
          </label>
        </Section>

        {/* ================= API MODE ================= */}
        <Section title="API Mode">
          <select name="api_mode" value={offer.api_mode} onChange={handleChange} style={styles.select}>
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </Section>

        {/* ================= STATUS CHECK ================= */}
        <Section title="Status Check API">
          <Input label="Status Check URL" name="status_check_url" value={offer.status_check_url} onChange={handleChange} />
          <Input
            label="Allowed Parameters (Advertiser dependent)"
            name="status_check_params"
            value={offer.status_check_params}
            onChange={handleChange}
          />
        </Section>

        {/* ================= PIN SEND ================= */}
        <Section title="PIN Send API">
          <Input label="PIN Send URL" name="pin_send_url" value={offer.pin_send_url} onChange={handleChange} />
          <Input
            label="Allowed Parameters (Advertiser dependent)"
            name="pin_send_params"
            value={offer.pin_send_params}
            onChange={handleChange}
          />
        </Section>

        {/* ================= PIN VERIFY ================= */}
        <Section title="PIN Verify API">
          <Input label="PIN Verify URL" name="pin_verify_url" value={offer.pin_verify_url} onChange={handleChange} />
          <Input
            label="Allowed Parameters (Advertiser dependent)"
            name="pin_verify_params"
            value={offer.pin_verify_params}
            onChange={handleChange}
          />
        </Section>

        {/* ================= REDIRECT ================= */}
        <Section title="Redirect (Mandatory)">
          <Input
            label="Redirect URL after OTP success"
            name="redirect_url"
            value={offer.redirect_url}
            onChange={handleChange}
            required
          />
        </Section>

        {/* ================= STEPS ================= */}
        <Section title="Execution Steps">
          <label style={styles.checkbox}>
            <input type="checkbox" name="step_status_check" checked={offer.step_status_check} onChange={handleChange} />
            Enable Status Check
          </label>
          <label style={styles.checkbox}>
            <input type="checkbox" name="step_pin_send" checked={offer.step_pin_send} onChange={handleChange} />
            Enable PIN Send
          </label>
          <label style={styles.checkbox}>
            <input type="checkbox" name="step_pin_verify" checked={offer.step_pin_verify} onChange={handleChange} />
            Enable PIN Verify
          </label>
        </Section>

        {/* ================= ACTIONS ================= */}
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.cancel}>Cancel</button>
          <button type="submit" style={styles.save}>
            {initialData ? "Update Offer" : "Save Offer"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= HELPERS ================= */
const normalize = (v) =>
  v ? v.split(",").map((x) => x.trim()).filter(Boolean) : [];

/* ================= UI ================= */
const Section = ({ title, children }) => (
  <div style={styles.section}>
    <h4 style={styles.sectionTitle}>{title}</h4>
    {children}
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    <input {...props} style={styles.input} />
  </div>
);

const Row = ({ children }) => <div style={styles.row}>{children}</div>;

const styles = {
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:50},
  card:{width:740,maxHeight:"90vh",overflowY:"auto",background:"#020617",padding:28,borderRadius:14,color:"#fff"},
  heading:{textAlign:"center",marginBottom:20},
  section:{marginBottom:20},
  sectionTitle:{color:"#38bdf8",fontSize:14,marginBottom:10},
  inputGroup:{display:"flex",flexDirection:"column",marginBottom:10},
  label:{fontSize:12,color:"#94a3b8",marginBottom:4},
  input:{padding:10,borderRadius:8,border:"1px solid #1e293b",background:"#020617",color:"#fff"},
  select:{padding:10,borderRadius:8,background:"#020617",color:"#fff",border:"1px solid #1e293b"},
  row:{display:"flex",gap:12},
  checkbox:{display:"flex",gap:8,alignItems:"center"},
  actions:{display:"flex",justifyContent:"space-between"},
  cancel:{background:"#334155",padding:"10px 18px",borderRadius:8,color:"#fff"},
  save:{background:"#16a34a",padding:"10px 18px",borderRadius:8,color:"#fff"}
};
