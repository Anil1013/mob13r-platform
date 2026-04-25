import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function LandingBuilder() {
  const [offers, setOffers] = useState([]);
  const [landings, setLandings] = useState([]);

  const [form, setForm] = useState({
    publisher_offer_id: "",
    title: "",
    description: "",
    image_url: "",
    button_text: "",
    disclaimer: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  /* ================= LOAD ================= */
  useEffect(() => {
    fetch(`${API_BASE}/api/landing/publisher-offers`)
      .then((res) => res.json())
      .then((data) => setOffers(data.data || []));

    loadLandings();
  }, []);

  const loadLandings = () => {
    fetch(`${API_BASE}/api/landing`)
      .then((res) => res.json())
      .then((data) => setLandings(data.data || []));
  };

  /* ================= FILE ================= */
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  /* ================= URL ================= */
  const handleUrlChange = (value) => {
    setForm({ ...form, image_url: value });
    setPreview(value);
    setImageFile(null); // URL priority
  };

  /* ================= CREATE ================= */
  const createLanding = async () => {
    if (!form.publisher_offer_id) {
      return alert("Select offer");
    }

    try {
      const fd = new FormData();

      // ✅ SAFE append
      Object.keys(form).forEach((k) => {
        if (form[k] !== undefined && form[k] !== null && form[k] !== "") {
          fd.append(k, form[k]);
        }
      });

      // ✅ file (optional)
      if (imageFile) {
        fd.append("imageFile", imageFile);
        fd.delete("image_url"); // file override
      }

      const res = await fetch(`${API_BASE}/api/landing`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (data.status === "SUCCESS") {
        alert("Landing Created ✅");

        loadLandings();

        // reset
        setForm({
          publisher_offer_id: "",
          title: "",
          description: "",
          image_url: "",
          button_text: "",
          disclaimer: "",
        });

        setImageFile(null);
        setPreview("");

      } else {
        alert(data.error || "Error creating landing");
      }
    } catch (err) {
      console.error(err);
      alert("Server Error");
    }
  };

  /* ================= COPY ================= */
  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert("Copied ✅");
  };

  /* ================= UI ================= */
  return (
    <>
      <Navbar />

      <div style={styles.container}>
        <h2 style={styles.heading}>Create Landing</h2>

        {/* ================= FORM ================= */}
        <div style={styles.form}>
          <select
            style={styles.input}
            value={form.publisher_offer_id}
            onChange={(e) =>
              setForm({ ...form, publisher_offer_id: e.target.value })
            }
          >
            <option value="">Select Offer</option>
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
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <input
            style={styles.input}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {/* URL */}
          <input
            style={styles.input}
            placeholder="Image URL"
            value={form.image_url}
            onChange={(e) => handleUrlChange(e.target.value)}
          />

          {/* FILE */}
          <input
            style={styles.input}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />

          <input
            style={styles.input}
            placeholder="Button Text"
            value={form.button_text}
            onChange={(e) =>
              setForm({ ...form, button_text: e.target.value })
            }
          />

          <input
            style={styles.input}
            placeholder="Disclaimer"
            value={form.disclaimer}
            onChange={(e) =>
              setForm({ ...form, disclaimer: e.target.value })
            }
          />

          <button style={styles.button} onClick={createLanding}>
            Save Landing
          </button>
        </div>

        {/* ================= PREVIEW ================= */}
        <div style={styles.preview}>
          {preview && (
            <img
              src={preview}
              style={styles.previewImg}
              alt=""
            />
          )}

          <h3>{form.title || "Landing Title"}</h3>

          <button style={styles.greenBtn}>
            {form.button_text || "Subscribe"}
          </button>
        </div>

        {/* ================= TABLE ================= */}
        <div style={styles.tableBox}>
          <h3>Landing Pages</h3>

          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Advertiser</th>
                <th>Publisher</th>
                <th>Offer</th>
                <th>Landing URL</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {landings.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{l.advertiser_name || "-"}</td>
                  <td>{l.publisher_name}</td>
                  <td>{l.offer_name}</td>

                  <td style={{ wordBreak: "break-all" }}>
                    {l.landing_url}
                  </td>

                  <td>
                    <button
                      style={styles.copyBtn}
                      onClick={() => copyUrl(l.landing_url)}
                    >
                      Copy
                    </button>

                    <a href={l.landing_url} target="_blank" rel="noreferrer">
                      <button style={styles.openBtn}>Open</button>
                    </a>
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

/* ================= STYLES ================= */
const styles = {
  container: {
    padding: "90px 30px",
    background: "#0f172a",
    minHeight: "100vh",
    color: "#fff",
  },
  heading: {
    marginBottom: 20,
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #334155",
    background: "#1e293b",
    color: "#fff",
  },
  button: {
    gridColumn: "span 3",
    padding: 14,
    background: "#3b82f6",
    border: "none",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },
  preview: {
    width: 260,
    padding: 20,
    background: "#1e293b",
    borderRadius: 10,
    marginBottom: 20,
  },
  previewImg: {
    width: "100%",
    height: 120,
    objectFit: "cover",
    marginBottom: 10,
  },
  greenBtn: {
    width: "100%",
    padding: 10,
    background: "#22c55e",
    border: "none",
    borderRadius: 6,
    color: "#fff",
  },
  tableBox: {
    background: "#1e293b",
    padding: 20,
    borderRadius: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  copyBtn: {
    marginRight: 5,
    padding: "5px 10px",
    background: "#000",
    color: "#fff",
    border: "none",
    borderRadius: 4,
  },
  openBtn: {
    padding: "5px 10px",
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 4,
  },
};
