import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Navbar from "../components/Navbar";

const API_BASE =
  "https://backend.mob13r.com";

const DEFAULT_FORM = {
  publisher_offer_id: "",

  title: "",

  subtitle: "",

  description: "",

  image_url: "",

  logo_url: "",

  background_url: "",

  button_text: "Continue",

  verify_button_text:
    "Confirm",

  disclaimer: "",

  theme_color: "#22c55e",

  text_color: "#ffffff",

  card_color: "#ffffff",

  success_redirect_url:
    "",

  show_timer: true,

  timer_seconds: 30,

  show_carrier_logo: true,

  show_geo: true,

  enable_resend_otp: true,

  enable_success_screen:
    true,

  show_disclaimer: true,

  success_title:
    "Subscription Successful",

  success_message:
    "Your subscription has been activated successfully.",

  redirect_delay_seconds: 3,

  rtl_enabled: false,

  language_code: "en",

  button_radius: 12,

  card_radius: 24,

  background_overlay:
    "rgba(0,0,0,0.45)",

  otp_box_style: "boxed",

  status: "active",
};

export default function LandingBuilder() {
  const [offers, setOffers] =
    useState([]);

  const [landings, setLandings] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [heroFile, setHeroFile] =
    useState(null);

  const [logoFile, setLogoFile] =
    useState(null);

  const [
    backgroundFile,
    setBackgroundFile,
  ] = useState(null);

  const [form, setForm] =
    useState(DEFAULT_FORM);

  const [isMobile, setIsMobile] =
    useState(
      window.innerWidth < 900
    );

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    loadOffers();

    loadLandings();
  }, []);

  /* =========================
     RESPONSIVE
  ========================= */

  useEffect(() => {
    const resize = () => {
      setIsMobile(
        window.innerWidth <
          900
      );
    };

    window.addEventListener(
      "resize",
      resize
    );

    return () =>
      window.removeEventListener(
        "resize",
        resize
      );
  }, []);

  /* =========================
     CLEANUP OBJECT URLS
  ========================= */

  useEffect(() => {
    return () => {
      if (heroFile) {
        URL.revokeObjectURL(
          heroFile
        );
      }

      if (logoFile) {
        URL.revokeObjectURL(
          logoFile
        );
      }

      if (backgroundFile) {
        URL.revokeObjectURL(
          backgroundFile
        );
      }
    };
  }, [
    heroFile,
    logoFile,
    backgroundFile,
  ]);

  /* =========================
     API LOADERS
  ========================= */

  const loadOffers = async () => {
    try {
      const res =
        await fetch(
          `${API_BASE}/api/landing/publisher-offers`
        );

      const data =
        await res.json();

      if (
        res.ok &&
        data.status ===
          "SUCCESS"
      ) {
        setOffers(
          data.data || []
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLandings =
    async () => {
      try {
        const res =
          await fetch(
            `${API_BASE}/api/landing`
          );

        const data =
          await res.json();

        if (
          res.ok &&
          data.status ===
            "SUCCESS"
        ) {
          setLandings(
            data.data || []
          );
        }
      } catch (err) {
        console.error(err);
      }
    };

  /* =========================
     CHANGE
  ========================= */

  const handleChange = (
    key,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /* =========================
     FILE VALIDATION
  ========================= */

  const validateFile = (
    file
  ) => {
    if (!file) return true;

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
    ];

    if (
      !allowed.includes(
        file.type
      )
    ) {
      alert(
        "Invalid image format"
      );

      return false;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      alert(
        "Image must be below 10MB"
      );

      return false;
    }

    return true;
  };

  /* =========================
     CREATE
  ========================= */

  const createLanding =
    async () => {
      if (
        !form.publisher_offer_id ||
        !form.title
      ) {
        return alert(
          "Select offer and enter title"
        );
      }

      if (
        !validateFile(
          heroFile
        ) ||
        !validateFile(
          logoFile
        ) ||
        !validateFile(
          backgroundFile
        )
      ) {
        return;
      }

      setLoading(true);

      try {
        const fd =
          new FormData();

        Object.keys(form).forEach(
          (key) => {
            let value =
              form[key];

            if (
              typeof value ===
              "boolean"
            ) {
              value = value
                ? "true"
                : "false";
            }

            if (
              value === null ||
              value === undefined
            ) {
              value = "";
            }

            fd.append(
              key,
              value
            );
          }
        );

        if (heroFile) {
          fd.append(
            "heroFile",
            heroFile
          );
        }

        if (logoFile) {
          fd.append(
            "logoFile",
            logoFile
          );
        }

        if (
          backgroundFile
        ) {
          fd.append(
            "backgroundFile",
            backgroundFile
          );
        }

        const res =
          await fetch(
            `${API_BASE}/api/landing`,
            {
              method: "POST",
              body: fd,
            }
          );

        const data =
          await res.json();

        if (
          res.ok &&
          data.status ===
            "SUCCESS"
        ) {
          alert(
            "Landing Created Successfully ✅"
          );

          await loadLandings();

          resetForm();

          window.scrollTo({
            top:
              document.body
                .scrollHeight,

            behavior:
              "smooth",
          });
        } else {
          alert(
            data.error ||
              data.message ||
              "Landing creation failed"
          );
        }
      } catch (err) {
        console.error(err);

        alert(
          "Network Error"
        );
      }

      setLoading(false);
    };

  /* =========================
     RESET
  ========================= */

  const resetForm = () => {
    setHeroFile(null);

    setLogoFile(null);

    setBackgroundFile(null);

    setForm(DEFAULT_FORM);
  };

  /* =========================
     COPY URL
  ========================= */

  const copyUrl = async (
    url
  ) => {
    try {
      await navigator.clipboard.writeText(
        url
      );

      alert("Copied ✅");
    } catch {
      alert(
        "Copy failed"
      );
    }
  };

  /* =========================
     PREVIEWS
  ========================= */

  const previewBackground =
    useMemo(() => {
      if (
        backgroundFile
      ) {
        return URL.createObjectURL(
          backgroundFile
        );
      }

      return (
        form.background_url ||
        ""
      );
    }, [
      backgroundFile,
      form.background_url,
    ]);

  const previewLogo =
    useMemo(() => {
      if (logoFile) {
        return URL.createObjectURL(
          logoFile
        );
      }

      return (
        form.logo_url || ""
      );
    }, [
      logoFile,
      form.logo_url,
    ]);

  const previewHero =
    useMemo(() => {
      if (heroFile) {
        return URL.createObjectURL(
          heroFile
        );
      }

      return (
        form.image_url || ""
      );
    }, [
      heroFile,
      form.image_url,
    ]);

  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <div
          style={styles.header}
        >
          <h1
            style={styles.heading}
          >
            Landing Builder
          </h1>

          <p
            style={
              styles.subheading
            }
          >
            Create premium
            dynamic carrier
            landing pages
          </p>
        </div>

        <div
          style={{
            ...styles.layout,

            gridTemplateColumns:
              isMobile
                ? "1fr"
                : "1.2fr 0.8fr",
          }}
        >
          {/* ======================
              BUILDER
          ====================== */}

          <div
            style={
              styles.builderCard
            }
          >
            <div
              style={
                styles.sectionTitle
              }
            >
              Landing Settings
            </div>

            <div
              style={
                styles.grid
              }
            >
              <select
                style={
                  styles.input
                }
                value={
                  form.publisher_offer_id
                }
                onChange={(
                  e
                ) =>
                  handleChange(
                    "publisher_offer_id",
                    e.target
                      .value
                  )
                }
              >
                <option value="">
                  Select
                  Publisher
                  Offer
                </option>

                {offers.map(
                  (o) => (
                    <option
                      key={
                        o.id
                      }
                      value={
                        o.id
                      }
                    >
                      {
                        o.service_name
                      }{" "}
                      -{" "}
                      {
                        o.publisher_name
                      }
                    </option>
                  )
                )}
              </select>

              <input
                style={
                  styles.input
                }
                placeholder="Title"
                value={
                  form.title
                }
                onChange={(
                  e
                ) =>
                  handleChange(
                    "title",
                    e.target
                      .value
                  )
                }
              />

              <input
                style={
                  styles.input
                }
                placeholder="Subtitle"
                value={
                  form.subtitle
                }
                onChange={(
                  e
                ) =>
                  handleChange(
                    "subtitle",
                    e.target
                      .value
                  )
                }
              />

              <textarea
                style={
                  styles.textarea
                }
                placeholder="Description"
                value={
                  form.description
                }
                onChange={(
                  e
                ) =>
                  handleChange(
                    "description",
                    e.target
                      .value
                  )
                }
              />

              <input
                style={
                  styles.input
                }
                placeholder="Button Text"
                value={
                  form.button_text
                }
                onChange={(
                  e
                ) =>
                  handleChange(
                    "button_text",
                    e.target
                      .value
                  )
                }
              />

              <input
                style={
                  styles.input
                }
                placeholder="Verify Button Text"
                value={
                  form.verify_button_text
                }
                onChange={(
                  e
                ) =>
                  handleChange(
                    "verify_button_text",
                    e.target
                      .value
                  )
                }
              />
            </div>

            {/* ======================
                COLORS
            ====================== */}

            <div
              style={
                styles.sectionTitle
              }
            >
              Theme
            </div>

            <div
              style={
                styles.grid3
              }
            >
              <ColorInput
                label="Theme"
                value={
                  form.theme_color
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "theme_color",
                    v
                  )
                }
              />

              <ColorInput
                label="Text"
                value={
                  form.text_color
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "text_color",
                    v
                  )
                }
              />

              <ColorInput
                label="Card"
                value={
                  form.card_color
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "card_color",
                    v
                  )
                }
              />
            </div>

            {/* ======================
                UPLOADS
            ====================== */}

            <div
              style={
                styles.sectionTitle
              }
            >
              Assets
            </div>

            <div
              style={
                styles.uploadGrid
              }
            >
              <UploadBox
                title="Hero Image"
                onFile={
                  setHeroFile
                }
              />

              <UploadBox
                title="Logo"
                onFile={
                  setLogoFile
                }
              />

              <UploadBox
                title="Background"
                onFile={
                  setBackgroundFile
                }
              />
            </div>

            {/* ======================
                FEATURES
            ====================== */}

            <div
              style={
                styles.sectionTitle
              }
            >
              Features
            </div>

            <div
              style={
                styles.toggleGrid
              }
            >
              <Toggle
                label="Show Timer"
                checked={
                  form.show_timer
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "show_timer",
                    v
                  )
                }
              />

              <Toggle
                label="Carrier Logo"
                checked={
                  form.show_carrier_logo
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "show_carrier_logo",
                    v
                  )
                }
              />

              <Toggle
                label="Show Geo"
                checked={
                  form.show_geo
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "show_geo",
                    v
                  )
                }
              />

              <Toggle
                label="Resend OTP"
                checked={
                  form.enable_resend_otp
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "enable_resend_otp",
                    v
                  )
                }
              />

              <Toggle
                label="Success Screen"
                checked={
                  form.enable_success_screen
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "enable_success_screen",
                    v
                  )
                }
              />

              <Toggle
                label="RTL Mode"
                checked={
                  form.rtl_enabled
                }
                onChange={(
                  v
                ) =>
                  handleChange(
                    "rtl_enabled",
                    v
                  )
                }
              />
            </div>

            <button
              style={{
                ...styles.createButton,

                opacity:
                  loading
                    ? 0.7
                    : 1,

                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",
              }}
              onClick={
                createLanding
              }
              disabled={
                loading
              }
            >
              {loading
                ? "Creating..."
                : "Create Landing"}
            </button>

            {/* ======================
                CREATED LANDINGS
            ====================== */}

            {landings.length >
              0 && (
              <>
                <div
                  style={{
                    ...styles.sectionTitle,
                    marginTop: 40,
                  }}
                >
                  Created
                  Landings
                </div>

                <div
                  style={
                    styles.landingList
                  }
                >
                  {landings.map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        style={
                          styles.landingItem
                        }
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                            }}
                          >
                            {
                              item.title
                            }
                          </div>

                          <div
                            style={{
                              opacity: 0.7,
                              fontSize: 12,
                            }}
                          >
                            {
                              item.landing_url
                            }
                          </div>
                        </div>

                        <button
                          style={
                            styles.copyButton
                          }
                          onClick={() =>
                            copyUrl(
                              item.landing_url
                            )
                          }
                        >
                          Copy
                        </button>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* ======================
              PREVIEW
          ====================== */}

          <div
            style={
              styles.previewPanel
            }
          >
            <div
              style={{
                ...styles.previewCard,

                backgroundImage:
                  previewBackground
                    ? `url(${previewBackground})`
                    : "none",

                color:
                  form.text_color,
              }}
            >
              <div
                style={{
                  ...styles.overlay,

                  background:
                    form.background_overlay,
                }}
              />

              <div
                style={{
                  ...styles.previewContent,

                  background:
                    form.card_color &&
                    form.card_color.startsWith(
                      "#"
                    )
                      ? `${form.card_color}20`
                      : "rgba(255,255,255,0.08)",

                  borderRadius:
                    form.card_radius,
                }}
              >
                {previewLogo && (
                  <img
                    src={
                      previewLogo
                    }
                    alt=""
                    style={
                      styles.logo
                    }
                  />
                )}

                {previewHero && (
                  <img
                    src={
                      previewHero
                    }
                    alt=""
                    style={
                      styles.hero
                    }
                  />
                )}

                <h2>
                  {form.title ||
                    "Landing Title"}
                </h2>

                <p
                  style={{
                    opacity: 0.8,
                  }}
                >
                  {form.subtitle ||
                    "Landing Subtitle"}
                </p>

                <p
                  style={
                    styles.previewDescription
                  }
                >
                  {form.description ||
                    "Premium subscription landing preview"}
                </p>

                <button
                  style={{
                    ...styles.previewButton,

                    background:
                      form.theme_color,

                    borderRadius:
                      form.button_radius,
                  }}
                >
                  {
                    form.button_text
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================
   COMPONENTS
========================= */

function Toggle({
  label,
  checked,
  onChange,
}) {
  return (
    <div
      style={
        styles.toggleItem
      }
    >
      <span>{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
      />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}) {
  return (
    <div
      style={styles.colorBox}
    >
      <label>{label}</label>

      <input
        type="color"
        value={
          value &&
          value.startsWith("#")
            ? value
            : "#ffffff"
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      />
    </div>
  );
}

function UploadBox({
  title,
  onFile,
}) {
  const handleDrop = (
    e
  ) => {
    e.preventDefault();

    if (
      e.dataTransfer
        .files?.[0]
    ) {
      onFile(
        e.dataTransfer
          .files[0]
      );
    }
  };

  return (
    <div
      style={styles.uploadBox}
      onDrop={handleDrop}
      onDragOver={(e) =>
        e.preventDefault()
      }
    >
      <div
        style={{
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        onChange={(e) => {
          if (
            e.target.files?.[0]
          ) {
            onFile(
              e.target
                .files[0]
            );
          }
        }}
      />

      <div
        style={{
          marginTop: 10,
          opacity: 0.6,
        }}
      >
        Drag & Drop or
        Upload
      </div>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  page: {
    minHeight: "100vh",

    padding:
      "100px 20px",

    background:
      "#020617",

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

    gap: 20,

    alignItems: "start",
  },

  builderCard: {
    background:
      "rgba(255,255,255,0.05)",

    border:
      "1px solid rgba(255,255,255,0.1)",

    borderRadius: 24,

    padding: 24,

    backdropFilter:
      "blur(20px)",
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

    backgroundSize:
      "cover",

    backgroundPosition:
      "center",
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

    backdropFilter:
      "blur(20px)",
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

    gridTemplateColumns:
      "repeat(3,1fr)",

    gap: 12,
  },

  colorBox: {
    display: "flex",

    flexDirection:
      "column",

    gap: 10,

    background:
      "rgba(255,255,255,0.04)",

    padding: 14,

    borderRadius: 16,
  },

  input: {
    width: "100%",

    padding: 14,

    borderRadius: 14,

    border:
      "1px solid rgba(255,255,255,0.1)",

    background:
      "rgba(255,255,255,0.04)",

    color: "#fff",

    outline: "none",
  },

  textarea: {
    width: "100%",

    minHeight: 120,

    padding: 14,

    borderRadius: 14,

    border:
      "1px solid rgba(255,255,255,0.1)",

    background:
      "rgba(255,255,255,0.04)",

    color: "#fff",

    outline: "none",
  },

  uploadGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(3,1fr)",

    gap: 14,
  },

  uploadBox: {
    border:
      "2px dashed rgba(255,255,255,0.15)",

    borderRadius: 20,

    padding: 20,

    textAlign: "center",

    background:
      "rgba(255,255,255,0.03)",
  },

  toggleGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(2,1fr)",

    gap: 12,
  },

  toggleItem: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    background:
      "rgba(255,255,255,0.04)",

    padding: 14,

    borderRadius: 14,
  },

  createButton: {
    width: "100%",

    padding: 18,

    marginTop: 30,

    borderRadius: 18,

    border: "none",

    background:
      "#22c55e",

    color: "#fff",

    fontWeight: 700,

    fontSize: 16,
  },

  landingList: {
    display: "grid",
    gap: 12,
  },

  landingItem: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    background:
      "rgba(255,255,255,0.04)",

    padding: 14,

    borderRadius: 14,
  },

  copyButton: {
    border: "none",

    background:
      "#22c55e",

    color: "#fff",

    padding:
      "10px 14px",

    borderRadius: 10,

    cursor: "pointer",

    fontWeight: 700,
  },
};
