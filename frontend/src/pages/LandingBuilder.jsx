import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function LandingBuilder() {
  const [offers, setOffers] = useState([]);
  const [landings, setLandings] = useState([]);

  const [loading, setLoading] = useState(false);

  const [heroFile, setHeroFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);

  const [form, setForm] = useState({
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
    card_color: "rgba(255,255,255,0.08)",

    success_redirect_url: "",

    show_timer: true,
    timer_seconds: 30,

    show_carrier_logo: true,
    show_geo: true,

    enable_resend_otp: true,

    enable_success_screen: true,

    success_title: "Subscription Successful",

    success_message:
      "Your subscription has been activated successfully.",

    redirect_delay_seconds: 3,

    rtl_enabled: false,

    language_code: "en",

    button_radius: 12,

    card_radius: 24,

    background_overlay: "rgba(0,0,0,0.45)",

    otp_box_style: "boxed",

    status: "active",
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/landing/publisher-offers`)
      .then((res) => res.json())
      .then((d) => setOffers(d.data || []));

    loadLandings();
  }, []);

  const loadLandings = () => {
    fetch(`${API_BASE}/api/landing`)
      .then((res) => res.json())
      .then((d) => setLandings(d.data || []));
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const createLanding = async () => {
    if (!form.publisher_offer_id || !form.title) {
      return alert("Select offer and enter title");
    }

    setLoading(true);

    try {
      const fd = new FormData();

      Object.keys(form).forEach((key) => {
        fd.append(key, form[key]);
      });

      if (heroFile) {
        fd.append("heroFile", heroFile);
      }

      if (logoFile) {
        fd.append("logoFile", logoFile);
      }

      if (backgroundFile) {
        fd.append("backgroundFile", backgroundFile);
      }

      const res = await fetch(`${API_BASE}/api/landing`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (data.status === "SUCCESS") {
        alert("Landing Created Successfully ✅");

        loadLandings();

        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      } else {
        alert(data.error || "Failed");
      }
    } catch (err) {
      alert("Network Error");
    }

    setLoading(false);
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert("Copied ✅");
  };

  const previewBackground = useMemo(() => {
    if (backgroundFile) {
      return URL.createObjectURL(backgroundFile);
    }

    return form.background_url || "";
  }, [backgroundFile, form.background_url]);

  const previewLogo = useMemo(() => {
    if (logoFile) {
      return URL.createObjectURL(logoFile);
    }

    return form.logo_url || "";
  }, [logoFile, form.logo_url]);

  const previewHero = useMemo(() => {
    if (heroFile) {
      return URL.createObjectURL(heroFile);
    }

    return form.image_url || "";
  }, [heroFile, form.image_url]);

  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Landing Builder</h1>

          <p style={styles.subheading}>
            Create premium carrier-grade dynamic landing pages
          </p>
        </div>

        <div style={styles.layout}>
          {/* =========================
              LEFT PANEL
          ========================= */}

          <div style={styles.builderCard}>
            <div style={styles.sectionTitle}>Landing Settings</div>

            <div style={styles.grid}>
              <select
                style={styles.input}
                value={form.publisher_offer_id}
                onChange={(e) =>
                  handleChange("publisher_offer_id", e.target.value)
                }
              >
                <option value="">Select Publisher Offer</option>

                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
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
                onChange={(e) =>
                  handleChange("description", e.target.value)
                }
              />

              <input
                style={styles.input}
                placeholder="Button Text"
                value={form.button_text}
                onChange={(e) =>
                  handleChange("button_text", e.target.value)
                }
              />

              <input
                style={styles.input}
                placeholder="Verify Button Text"
                value={form.verify_button_text}
                onChange={(e) =>
                  handleChange(
                    "verify_button_text",
                    e.target.value
                  )
                }
              />

              <textarea
                style={styles.textarea}
                placeholder="Disclaimer"
                value={form.disclaimer}
                onChange={(e) =>
                  handleChange("disclaimer", e.target.value)
                }
              />

              <input
                style={styles.input}
                placeholder="Success Redirect URL"
                value={form.success_redirect_url}
                onChange={(e) =>
                  handleChange(
                    "success_redirect_url",
                    e.target.value
                  )
                }
              />
            </div>

            {/* =========================
                COLORS
            ========================= */}

            <div style={styles.sectionTitle}>Theme</div>

            <div style={styles.grid3}>
              <div style={styles.colorBox}>
                <label>Theme</label>

                <input
                  type="color"
                  value={form.theme_color}
                  onChange={(e) =>
                    handleChange("theme_color", e.target.value)
                  }
                />
              </div>

              <div style={styles.colorBox}>
                <label>Text</label>

                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) =>
                    handleChange("text_color", e.target.value)
                  }
                />
              </div>

              <div style={styles.colorBox}>
                <label>Card</label>

                <input
                  type="color"
                  value={form.card_color}
                  onChange={(e) =>
                    handleChange("card_color", e.target.value)
                  }
                />
              </div>
            </div>

            {/* =========================
                FILE UPLOADS
            ========================= */}

            <div style={styles.sectionTitle}>Assets</div>

            <div style={styles.uploadGrid}>
              <UploadBox
                title="Hero Image"
                onFile={setHeroFile}
              />

              <UploadBox
                title="Logo"
                onFile={setLogoFile}
              />

              <UploadBox
                title="Background"
                onFile={setBackgroundFile}
              />
            </div>

            {/* =========================
                TOGGLES
            ========================= */}

            <div style={styles.sectionTitle}>Features</div>

            <div style={styles.toggleGrid}>
              <Toggle
                label="Show Timer"
                checked={form.show_timer}
                onChange={(v) => handleChange("show_timer", v)}
              />

              <Toggle
                label="Carrier Logo"
                checked={form.show_carrier_logo}
                onChange={(v) =>
                  handleChange("show_carrier_logo", v)
                }
              />

              <Toggle
                label="Show Geo"
                checked={form.show_geo}
                onChange={(v) => handleChange("show_geo", v)}
              />

              <Toggle
                label="Resend OTP"
                checked={form.enable_resend_otp}
                onChange={(v) =>
                  handleChange("enable_resend_otp", v)
                }
              />

              <Toggle
                label="Success Screen"
                checked={form.enable_success_screen}
                onChange={(v) =>
                  handleChange(
                    "enable_success_screen",
                    v
                  )
                }
              />

              <Toggle
                label="RTL Mode"
                checked={form.rtl_enabled}
                onChange={(v) =>
                  handleChange("rtl_enabled", v)
                }
              />
            </div>

            <button
              style={styles.createButton}
              onClick={createLanding}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Landing"}
            </button>
          </div>

          {/* =========================
              PREVIEW
          ========================= */}

          <div style={styles.previewPanel}>
            <div
              style={{
                ...styles.previewCard,

                backgroundImage: previewBackground
                  ? `url(${previewBackground})`
                  : "none",

                color: form.text_color,
              }}
            >
              <div
                style={{
                  ...styles.overlay,
                  background: form.background_overlay,
                }}
              />

              <div
                style={{
                  ...styles.previewContent,

                  background: form.card_color,

                  borderRadius: form.card_radius,
                }}
              >
                {previewLogo && (
                  <img
                    src={previewLogo}
                    alt=""
                    style={styles.logo}
                  />
                )}

                {previewHero && (
                  <img
                    src={previewHero}
                    alt=""
                    style={styles.hero}
                  />
                )}

                <h2>{form.title || "Landing Title"}</h2>

                <p style={{ opacity: 0.8 }}>
                  {form.subtitle || "Landing Subtitle"}
                </p>

                <p style={styles.previewDescription}>
                  {form.description ||
                    "Premium subscription landing preview"}
                </p>

                <button
                  style={{
                    ...styles.previewButton,
                    background: form.theme_color,
                    borderRadius: form.button_radius,
                  }}
                >
                  {form.button_text}
                </button>

                {form.show_disclaimer && (
                  <div style={styles.previewDisclaimer}>
                    {form.disclaimer ||
                      "By continuing you agree to the subscription terms."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================
            LANDINGS TABLE
        ========================= */}

        <div style={styles.tableCard}>
          <div style={styles.sectionTitle}>
            Existing Landings
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Offer</th>
                <th>Publisher</th>
                <th>Status</th>
                <th>Landing URL</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {landings.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>

                  <td>{l.offer_name}</td>

                  <td>{l.publisher_name}</td>

                  <td>
                    <span style={styles.statusBadge}>
                      {l.status}
                    </span>
                  </td>

                  <td style={styles.urlCell}>
                    {l.landing_url}
                  </td>

                  <td>
                    <div style={styles.actions}>
                      <button
                        style={styles.copyBtn}
                        onClick={() =>
                          copyUrl(l.landing_url)
                        }
                      >
                        Copy
                      </button>

                      <a
                        href={l.landing_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <button style={styles.openBtn}>
                          Open
                        </button>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* =========================
   TOGGLE
========================= */

function Toggle({ label, checked, onChange }) {
  return (
    <div style={styles.toggleItem}>
      <span>{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

/* =========================
   UPLOAD BOX
========================= */

function UploadBox({ title, onFile }) {
  const handleDrop = (e) => {
    e.preventDefault();

    if (e.dataTransfer.files[0]) {
      onFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      style={styles.uploadBox}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div>{title}</div>

      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        onChange={(e) => onFile(e.target.files[0])}
      />
    </div>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  page: {
    minHeight: "100vh",
    padding: "100px 20px",
    background: "#020617",
    color: "#fff",
  },

  header: {
    marginBottom: 30,
  },

  heading: {
    fontSize: 34,
    fontWeight: 700,
  },

  subheading: {
    opacity: 0.7,
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 20,
    alignItems: "start",
  },

  builderCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 24,
    padding: 24,
    backdropFilter: "blur(20px)",
  },

  previewPanel: {
    position: "sticky",
    top: 100,
  },

  previewCard: {
    minHeight: 760,
    borderRadius: 30,
    overflow: "hidden",
    position: "relative",
    backgroundSize: "cover",
    backgroundPosition: "center",
    border: "1px solid rgba(255,255,255,0.1)",
  },

  overlay: {
    position: "absolute",
    inset: 0,
  },

  previewContent: {
    position: "relative",
    zIndex: 5,
    margin: 30,
    padding: 30,
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    objectFit: "cover",
    marginBottom: 20,
  },

  hero: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 18,
    marginBottom: 20,
  },

  previewDescription: {
    opacity: 0.85,
    lineHeight: 1.7,
    marginTop: 12,
  },

  previewButton: {
    width: "100%",
    padding: 16,
    border: "none",
    marginTop: 24,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  previewDisclaimer: {
    marginTop: 20,
    fontSize: 12,
    opacity: 0.7,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 18,
    marginTop: 10,
  },

  grid: {
    display: "grid",
    gap: 14,
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 12,
  },

  colorBox: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "rgba(255,255,255,0.04)",
    padding: 14,
    borderRadius: 16,
  },

  input: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    minHeight: 120,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },

  uploadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 14,
  },

  uploadBox: {
    border: "2px dashed rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 20,
    textAlign: "center",
    background: "rgba(255,255,255,0.03)",
  },

  toggleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 12,
  },

  toggleItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.04)",
    padding: 14,
    borderRadius: 14,
  },

  createButton: {
    width: "100%",
    padding: 18,
    marginTop: 30,
    borderRadius: 18,
    border: "none",
    background: "#22c55e",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 16,
  },

  tableCard: {
    marginTop: 30,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 24,
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  statusBadge: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "#22c55e",
    fontSize: 12,
    fontWeight: 700,
  },

  urlCell: {
    maxWidth: 280,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  actions: {
    display: "flex",
    gap: 10,
  },

  copyBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },

  openBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#22c55e",
    color: "#fff",
    cursor: "pointer",
  },
};
