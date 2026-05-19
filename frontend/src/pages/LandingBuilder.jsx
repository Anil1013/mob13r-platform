import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

const DEFAULT_FORM = {
  publisher_offer_id: "",
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  logo_url: "",
  background_url: "",
  button_text: "Continue",
  verify_button_text: "Confirm",
  disclaimer: "",
  theme_color: "#22c55e",
  text_color: "#ffffff",
  card_color: "#ffffff",
  success_redirect_url: "",
  show_timer: true,
  timer_seconds: 30,
  show_carrier_logo: true,
  show_geo: true,
  enable_resend_otp: true,
  enable_success_screen: true,
  show_disclaimer: true,
  success_title: "Subscription Successful",
  success_message: "Your subscription has been activated successfully.",
  redirect_delay_seconds: 3,
  rtl_enabled: false,
  language_code: "en",
  button_radius: 12,
  card_radius: 24,
  background_overlay: "rgba(0,0,0,0.45)",
  otp_box_style: "boxed",
  status: "active",
};

export default function LandingBuilder() {
  const [offers, setOffers] = useState([]);
  const [landings, setLandings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [heroFile, setHeroFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 900 : false);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      publisher_offer_id: item.publisher_offer_id || "",
      title: item.title || "",
      subtitle: item.subtitle || "",
      description: item.description || "",
      image_url: item.image_url || "",
      logo_url: item.logo_url || "",
      background_url: item.background_url || "",
      button_text: item.button_text || "Continue",
      verify_button_text: item.verify_button_text || "Confirm",
      disclaimer: item.disclaimer || "",
      theme_color: item.theme_color || "#22c55e",
      text_color: item.text_color || "#ffffff",
      card_color: item.card_color || "#ffffff",
      success_redirect_url: item.success_redirect_url || "",
      show_timer: item.show_timer ?? true,
      timer_seconds: item.timer_seconds || 30,
      show_carrier_logo: item.show_carrier_logo ?? true,
      show_geo: item.show_geo ?? true,
      enable_resend_otp: item.enable_resend_otp ?? true,
      enable_success_screen: item.enable_success_screen ?? true,
      show_disclaimer: item.show_disclaimer ?? true,
      success_title: item.success_title || "Subscription Successful",
      success_message: item.success_message || "Your subscription has been activated successfully.",
      redirect_delay_seconds: item.redirect_delay_seconds || 3,
      rtl_enabled: item.rtl_enabled ?? false,
      language_code: item.language_code || "en",
      button_radius: item.button_radius || 12,
      card_radius: item.card_radius || 24,
      background_overlay: item.background_overlay || "rgba(0,0,0,0.45)",
      otp_box_style: item.otp_box_style || "boxed",
      status: item.status || "active",
    });
    setHeroFile(null);
    setLogoFile(null);
    setBackgroundFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Editing: " + item.title, "info");
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const deleteLanding = async (id, title) => {
    if (!confirm("Delete '" + title + "'?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/landing/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        showToast("Deleted!");
        loadLandings();
      } else {
        showToast("Delete failed", "error");
      }
    } catch {
      showToast("Network Error", "error");
    }
  };

  const appendFormFields = (fd) => {
    Object.keys(form).forEach((key) => {
      let value = form[key];
      if (typeof value === "boolean") value = value ? "true" : "false";
      if (value === null || value === undefined) value = "";
      fd.append(key, value);
    });
    if (heroFile) fd.append("heroFile", heroFile);
    if (logoFile) fd.append("logoFile", logoFile);
    if (backgroundFile) fd.append("backgroundFile", backgroundFile);
  };

  const updateLanding = async () => {
    if (!form.title) return alert("Enter title");
    setLoading(true);
    try {
      const fd = new FormData();
      appendFormFields(fd);

      const res = await fetch(`${API_BASE}/api/landing/${editingId}`, { method: "PATCH", body: fd });
      const data = await res.json();
      if (res.ok && (data.status === "SUCCESS" || data.id)) {
        showToast("Updated!");
        await loadLandings();
        cancelEdit();
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch {
      showToast("Network Error", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOffers();
    loadLandings();
  }, []);

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Previews Setup with auto-cleanup
  const previewBackground = useMemo(() => {
    if (backgroundFile) {
      const url = URL.createObjectURL(backgroundFile);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    }
    return { url: form.background_url || "", revoke: () => {} };
  }, [backgroundFile, form.background_url]);

  const previewLogo = useMemo(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    }
    return { url: form.logo_url || "", revoke: () => {} };
  }, [logoFile, form.logo_url]);

  const previewHero = useMemo(() => {
    if (heroFile) {
      const url = URL.createObjectURL(heroFile);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    }
    return { url: form.image_url || "", revoke: () => {} };
  }, [heroFile, form.image_url]);

  useEffect(() => {
    return () => {
      previewBackground.revoke();
      previewLogo.revoke();
      previewHero.revoke();
    };
  }, [previewBackground, previewLogo, previewHero]);

  const loadOffers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/landing/publisher-offers`);
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setOffers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLandings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/landing`);
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        setLandings(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateFile = (file) => {
    if (!file) return true;
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      alert("Invalid image format");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be below 10MB");
      return false;
    }
    return true;
  };

  const createLanding = async () => {
    if (!form.publisher_offer_id || !form.title) {
      return alert("Select offer and enter title");
    }
    if (!validateFile(heroFile) || !validateFile(logoFile) || !validateFile(backgroundFile)) {
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      appendFormFields(fd);

      const res = await fetch(`${API_BASE}/api/landing`, { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok && data.status === "SUCCESS") {
        alert("Landing Created Successfully ✅");
        await loadLandings();
        resetForm();
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      } else {
        alert(data.error || data.message || "Landing creation failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network Error");
    }
    setLoading(false);
  };

  const resetForm = () => {
    setHeroFile(null);
    setLogoFile(null);
    setBackgroundFile(null);
    setForm(DEFAULT_FORM);
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Copied ✅");
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Landing Builder</h1>
          <p style={styles.subheading}>Create premium dynamic carrier landing pages</p>
        </div>

        <div style={{ ...styles.layout, gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr" }}>
          
          {/* LEFT PANEL: CONFIGURATION BUILDER */}
          <div style={styles.builderCard}>
            <div style={styles.sectionTitle}>Landing Settings</div>
            <div style={styles.grid}>
              <select
                style={styles.select}
                value={form.publisher_offer_id}
                onChange={(e) => handleChange("publisher_offer_id", e.target.value)}
              >
                <option value="" style={styles.selectOption}>Select Publisher Offer</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id} style={styles.selectOption}>
                    {o.service_name} - {o.publisher_name}
                  </option>
                ))}
              </select>

              <input
                style={styles.input}
                placeholder="Title"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Subtitle"
                value={form.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
              />
              <textarea
                style={styles.textarea}
                placeholder="Description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Button Text"
                value={form.button_text}
                onChange={(e) => handleChange("button_text", e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Verify Button Text"
                value={form.verify_button_text}
                onChange={(e) => handleChange("verify_button_text", e.target.value)}
              />
            </div>

            {/* THEME COLORS */}
            <div style={styles.sectionTitle}>Theme</div>
            <div style={styles.grid3}>
              <ColorInput label="Theme" value={form.theme_color} onChange={(v) => handleChange("theme_color", v)} />
              <ColorInput label="Text" value={form.text_color} onChange={(v) => handleChange("text_color", v)} />
              <ColorInput label="Card" value={form.card_color} onChange={(v) => handleChange("card_color", v)} />
            </div>

            {/* FILE ASSETS */}
            <div style={styles.sectionTitle}>Assets</div>
            <div style={styles.uploadGrid}>
              <UploadBox title="Hero Image" onFile={setHeroFile} />
              <UploadBox title="Logo" onFile={setLogoFile} />
              <UploadBox title="Background" onFile={setBackgroundFile} />
            </div>

            {/* FEATURE TOGGLES */}
            <div style={styles.sectionTitle}>Features</div>
            <div style={styles.toggleGrid}>
              <Toggle label="Show Timer" checked={form.show_timer} onChange={(v) => handleChange("show_timer", v)} />
              <Toggle label="Carrier Logo" checked={form.show_carrier_logo} onChange={(v) => handleChange("show_carrier_logo", v)} />
              <Toggle label="Show Geo" checked={form.show_geo} onChange={(v) => handleChange("show_geo", v)} />
              <Toggle label="Resend OTP" checked={form.enable_resend_otp} onChange={(v) => handleChange("enable_resend_otp", v)} />
              <Toggle label="Success Screen" checked={form.enable_success_screen} onChange={(v) => handleChange("enable_success_screen", v)} />
              <Toggle label="RTL Mode" checked={form.rtl_enabled} onChange={(v) => handleChange("rtl_enabled", v)} />
            </div>

            {/* EDIT STATE DISPLAYS */}
            {editingId && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>✏️ Editing Landing #{editingId}</span>
                <button style={{ border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }} onClick={cancelEdit}>✕ Cancel</button>
              </div>
            )}

            {/* TOAST SYSTEM */}
            {toast && (
              <div style={{ background: toast.type === "error" ? "rgba(239,68,68,0.15)" : toast.type === "info" ? "rgba(59,130,246,0.15)" : "rgba(34,197,94,0.15)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : toast.type === "info" ? "rgba(59,130,246,0.3)" : "rgba(34,197,94,0.3)"}`, color: toast.type === "error" ? "#ef4444" : toast.type === "info" ? "#3b82f6" : "#22c55e", padding: "10px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>{toast.msg}</div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
              {editingId ? (
                <>
                  <button style={{ ...styles.createButton, flex: 1, marginTop: 0, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }} onClick={updateLanding} disabled={loading}>
                    {loading ? "Updating..." : "✅ Update Landing"}
                  </button>
                  <button style={{ ...styles.createButton, flex: 0.4, marginTop: 0, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }} onClick={cancelEdit}>Cancel</button>
                </>
              ) : (
                <button style={{ ...styles.createButton, flex: 1, marginTop: 0, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }} onClick={createLanding} disabled={loading}>
                  {loading ? "Creating..." : "Create Landing"}
                </button>
              )}
            </div>

            {/* CREATED LISTINGS LIST */}
            {landings.length > 0 && (
              <>
                <div style={{ ...styles.sectionTitle, marginTop: 40 }}>Created Landings</div>
                <div style={styles.landingList}>
                  {landings.map((item) => (
                    <div key={item.id} style={styles.landingItem}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{item.title}</div>
                        <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4, color: "#22c55e" }}>
                          {item.offer_name && `Offer: ${item.offer_name}`} {item.publisher_name && ` | Publisher: ${item.publisher_name}`}
                        </div>
                        <div style={{ opacity: 0.6, fontSize: 11, marginTop: 2 }}>{item.landing_url}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={styles.copyButton} onClick={() => copyUrl(item.landing_url)}>Copy</button>
                        <button style={{ border: "none", background: "rgba(59,130,246,0.15)", color: "#3b82f6", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 700 }} onClick={() => startEdit(item)}>Edit</button>
                        <button style={{ border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 10px", borderRadius: 10, cursor: "pointer" }} onClick={() => deleteLanding(item.id, item.title)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RIGHT PANEL: FULL HEIGHT STREAMLINED LANDING PAGE LIVE PREVIEW */}
          <div style={styles.previewPanel}>
            <div style={{ ...styles.previewCard, backgroundImage: previewBackground.url ? `url(${previewBackground.url})` : "none", color: form.text_color }}>
              
              {/* Core Overlay covering full area background */}
              <div style={{ ...styles.overlay, background: form.background_overlay }} />
              
              {/* Dynamic content card stretched as a real page view container */}
              <div style={{ ...styles.previewContent, background: form.card_color && form.card_color.startsWith("#") ? `${form.card_color}F2` : "#ffffff", borderRadius: form.card_radius }}>
                
                <div style={styles.previewHeaderContainer}>
                  {previewLogo.url ? (
                    <img src={previewLogo.url} alt="Logo" style={styles.logo} />
                  ) : (
                    <div style={{...styles.logo, background: form.theme_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff'}}>Brand</div>
                  )}
                  {form.show_carrier_logo && <div style={styles.carrierPlaceholder}>⚡ Carrier Partner</div>}
                </div>

                {previewHero.url && <img src={previewHero.url} alt="Hero Asset" style={styles.hero} />}
                
                <div style={{ textAlign: form.rtl_enabled ? "right" : "left", direction: form.rtl_enabled ? "rtl" : "ltr" }}>
                  <h2 style={{ fontSize: 26, fontWeight: 800, margin: "10px 0", color: "#1e293b" }}>{form.title || "Premium Subscription Title"}</h2>
                  <p style={{ opacity: 0.9, fontSize: 15, margin: "5px 0", color: "#475569", fontWeight: 500 }}>{form.subtitle || "Access unlimited contents immediately"}</p>
                  
                  {form.show_timer && (
                    <div style={{...styles.timerBox, borderColor: form.theme_color, color: form.theme_color}}>
                      ⏳ Offer expires in: <strong>{form.timer_seconds}s</strong>
                    </div>
                  )}

                  <p style={{...styles.previewDescription, color: "#64748b"}}>{form.description || "Enter your mobile information inside the next steps to start authentication."}</p>
                </div>

                <div style={styles.actionSection}>
                  <button style={{ ...styles.previewButton, background: form.theme_color, borderRadius: form.button_radius }}>
                    {form.button_text}
                  </button>
                  {form.show_disclaimer && (
                    <p style={styles.disclaimerText}>{form.disclaimer || "Terms & Conditions apply. Premium value services charged weekly."}</p>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// SUB COMPONENTS
function Toggle({ label, checked, onChange }) {
  return (
    <div style={styles.toggleItem}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div style={styles.colorBox}>
      <label>{label}</label>
      <input type="color" value={value && value.startsWith("#") ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function UploadBox({ title, onFile }) {
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]);
  };
  return (
    <div style={styles.uploadBox} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600 }}>{title}</div>
      <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" style={{fontSize: 11, maxWidth: '100%'}} onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
    </div>
  );
}

/* =========================
   UPDATED STYLES
========================= */
const styles = {
  page: { minHeight: "100vh", padding: "80px 20px", background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: "#fff" },
  header: { marginBottom: 30 },
  heading: { fontSize: 34, fontWeight: 700 },
  subheading: { opacity: 0.7 },
  layout: { display: "grid", gap: 24, alignItems: "start" },
  builderCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 24, backdropFilter: "blur(20px)" },
  
  // PREVIEW LIVE VIEW WINDOW (Full dynamic screen height adjustment)
  previewPanel: { position: "sticky", top: 100 },
  previewCard: { 
    minHeight: "calc(100vh - 160px)", 
    borderRadius: 24, 
    overflow: "hidden", 
    position: "relative", 
    backgroundSize: "cover", 
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column"
  },
  overlay: { position: "absolute", inset: 0, zIndex: 1 },
  previewContent: { 
    position: "relative", 
    zIndex: 5, 
    flex: 1,
    margin: 0, 
    padding: "40px 30px", 
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "inset 0px 0px 40px rgba(0,0,0,0.05)"
  },
  previewHeaderContainer: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 15 },
  carrierPlaceholder: { background: "#e2e8f0", color: "#334155", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  timerBox: { border: "1px solid", padding: "8px 12px", borderRadius: 8, margin: "10px 0", display: "inline-block", fontSize: 13, background: "rgba(0,0,0,0.02)" },
  actionSection: { marginTop: "auto", width: "100%" },
  disclaimerText: { fontSize: 11, textAlign: "center", color: "#94a3b8", marginTop: 12, lineHeight: 1.4 },

  logo: { width: 60, height: 60, borderRadius: 14, objectFit: "cover" },
  hero: { width: "100%", height: 240, objectFit: "cover", borderRadius: 16, marginBottom: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  previewDescription: { opacity: 0.9, lineHeight: 1.6, marginTop: 10, fontSize: 14 },
  previewButton: { width: "100%", padding: "18px", border: "none", color: "#fff", fontWeight: 700, fontSize: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.15)", cursor: "pointer" },
  
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 18, marginTop: 24 },
  grid: { display: "grid", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 },
  colorBox: { display: "flex", flexDirection: "column", gap: 10, background: "rgba(255,255,255,0.04)", padding: 14, borderRadius: 16 },
  input: { width: "100%", padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", outline: "none" },
  
  // DROPDOWN CRITICAL VISIBILITY FIXES
  select: { width: "100%", padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: '#1e293b', color: "#fff", outline: "none", cursor: "pointer" },
  selectOption: { background: "#1e293b", color: "#ffffff", padding: 12 },

  textarea: { width: "100%", minHeight: 100, padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", outline: "none" },
  uploadGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  uploadBox: { border: "2px dashed rgba(255,255,255,0.15)", borderRadius: 16, padding: "12px 8px", textAlign: "center", background: "rgba(255,255,255,0.03)" },
  toggleGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 },
  toggleItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: 14, borderRadius: 14 },
  createButton: { width: "100%", padding: 18, borderRadius: 18, border: "none", background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', color: "#fff", fontWeight: 700, fontSize: 16 },
  landingList: { display: "grid", gap: 12 },
  landingItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: 14, borderRadius: 14 },
  copyButton: { border: "none", background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: "#fff", padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
};
