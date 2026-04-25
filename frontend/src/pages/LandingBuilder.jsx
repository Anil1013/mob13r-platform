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
      // Reset text URL if file is selected
      setForm((prev) => ({ ...prev, image_url: "" }));
    }
  };

  /* ================= URL ================= */
  const handleUrlChange = (value) => {
    setForm({ ...form, image_url: value });
    setPreview(value);
    setImageFile(null); // URL priority logic
  };

  /* ================= CREATE ================= */
  const createLanding = async () => {
    if (!form.publisher_offer_id) return alert("Please select an offer");

    try {
      const fd = new FormData();
      
      // ✅ Proper way to append data for Multipart/Form-Data
      fd.append("publisher_offer_id", form.publisher_offer_id);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("button_text", form.button_text);
      fd.append("disclaimer", form.disclaimer);
      
      // If file exists, send file, else send text URL
      if (imageFile) {
        fd.append("imageFile", imageFile);
      } else {
        fd.append("image_url", form.image_url);
      }

      const res = await fetch(`${API_BASE}/api/landing`, {
        method: "POST",
        body: fd, // Browser automatically sets Content-Type to multipart/form-data
      });

      const data = await res.json();

      if (data.status === "SUCCESS") {
        alert("Landing Created ✅");
        loadLandings();
        
        // Full Reset
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
        alert(data.error || "Server responded with error");
      }
    } catch (err) {
      console.error(err);
      alert("Critical Error: Please check if backend is running");
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert("Copied ✅");
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <h2 style={styles.heading}>Create Landing</h2>

        <div style={styles.form}>
          <select
            style={styles.input}
            value={form.publisher_offer_id}
            onChange={(e) => setForm({ ...form, publisher_offer_id: e.target.value })}
          >
            <option value="">Select Offer</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>{o.service_name} - {o.publisher_name}</option>
            ))}
          </select>

          <input style={styles.input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input style={styles.input} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input style={styles.input} placeholder="Image URL (Manual)" value={form.image_url} onChange={(e) => handleUrlChange(e.target.value)} />
          
          <input style={{...styles.input, paddingTop: '8px'}} type="file" accept="image/*" onChange={handleFileChange} />
          
          <input style={styles.input} placeholder="Button Text" value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
          <input style={styles.input} placeholder="Disclaimer" value={form.disclaimer} onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} />

          <button style={styles.button} onClick={createLanding}>Save Landing</button>
        </div>

        {/* PREVIEW BOX */}
        <div style={styles.preview}>
          <p style={{fontSize: '10px', color: '#64748b', margin: '0 0 10px 0'}}>Live Preview</p>
          {preview ? (
            <img src={preview} style={styles.previewImg} alt="Content Preview" />
          ) : (
            <div style={{height: 120, background: '#334155', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 10}}>No Image Selected</div>
          )}
          <h3>{form.title || "Game Title"}</h3>
          <button style={styles.greenBtn}>{form.button_text || "Continue"}</button>
        </div>

        {/* TABLE SECTION (CENTERED ACTION BUTTONS) */}
        <div style={styles.tableBox}>
          <table style={styles.table}>
            <thead>
              <tr style={{borderBottom: '2px solid #334155'}}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Advertiser</th>
                <th style={styles.th}>Publisher</th>
                <th style={styles.th}>Offer</th>
                <th style={styles.th}>URL</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {landings.map((l) => (
                <tr key={l.id} style={{borderBottom: '1px solid #334155'}}>
                  <td style={styles.td}>{l.id}</td>
                  <td style={styles.td}>{l.advertiser_name || "-"}</td>
                  <td style={styles.td}>{l.publisher_name}</td>
                  <td style={styles.td}>{l.offer_name}</td>
                  <td style={{ ...styles.td, wordBreak: "break-all", maxWidth: 200, fontSize: 11 }}>{l.landing_url}</td>
                  <td style={styles.td}>
                    {/* ✅ CENTER ALIGNMENT FIX */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                       <button style={styles.copyBtn} onClick={() => copyUrl(l.landing_url)}>Copy</button>
                       <a href={l.landing_url} target="_blank" rel="noreferrer">
                         <button style={styles.openBtn}>Open</button>
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

const styles = {
  container: { padding: "90px 30px", background: "#0f172a", minHeight: "100vh", color: "#fff" },
  heading: { marginBottom: 20, textAlign: 'center' },
  form: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 30, background: "#1e293b", padding: 20, borderRadius: 12 },
  input: { padding: 12, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" },
  button: { gridColumn: "span 3", padding: 14, background: "#3b82f6", border: "none", color: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: "bold" },
  preview: { width: 260, padding: 20, background: "#1e293b", borderRadius: 10, marginBottom: 30, textAlign: 'center', border: '1px dashed #334155' },
  previewImg: { width: "100%", height: 120, objectFit: "cover", marginBottom: 10, borderRadius: 5 },
  greenBtn: { width: "100%", padding: 10, background: "#22c55e", border: "none", borderRadius: 6, color: "#fff", fontWeight: 'bold' },
  tableBox: { background: "#1e293b", padding: 20, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: 12, color: '#94a3b8', fontSize: 13, textAlign: 'center' },
  td: { padding: 15, textAlign: 'center', verticalAlign: 'middle' },
  copyBtn: { padding: "6px 12px", background: "#000", color: "#fff", border: "none", borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  openBtn: { padding: "6px 12px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, cursor: 'pointer', fontSize: 12 },
};
