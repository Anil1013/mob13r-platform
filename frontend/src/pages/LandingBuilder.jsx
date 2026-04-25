import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function LandingBuilder() {
  const [offers, setOffers] = useState([]);
  const [landings, setLandings] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [form, setForm] = useState({ publisher_offer_id: "", title: "", description: "", button_text: "", disclaimer: "" });

  useEffect(() => {
    fetch(`${API_BASE}/api/landing/publisher-offers`).then(res => res.json()).then(data => setOffers(data.data || []));
    loadLandings();
  }, []);

  const loadLandings = () => { fetch(`${API_BASE}/api/landing`).then(res => res.json()).then(data => setLandings(data.data || [])); };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const createLanding = async () => {
    if (!form.publisher_offer_id) return alert("Select offer");
    const fd = new FormData();
    Object.keys(form).forEach(key => fd.append(key, form[key]));
    if (imageFile) fd.append("imageFile", imageFile);

    const res = await fetch(`${API_BASE}/api/landing`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.status === "SUCCESS") { alert("Landing Created ✅"); loadLandings(); setPreviewUrl(""); }
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Create Landing</h2>
        <div style={styles.form}>
          <select style={styles.input} onChange={(e) => setForm({ ...form, publisher_offer_id: e.target.value })}>
            <option value="">Select Offer</option>
            {offers.map((o) => ( <option key={o.id} value={o.id}>{o.service_name} - {o.publisher_name}</option> ))}
          </select>
          <input style={styles.input} placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input style={styles.input} placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div style={{ gridColumn: "span 3", background: "#f8fafc", padding: 15, borderRadius: 8, border: "1px dashed #cbd5e1", textAlign: 'center' }}>
            <label>Upload Image: </label><input type="file" accept="image/*" onChange={handleFileChange} />
            {previewUrl && (
              <div style={{ marginTop: 15 }}>
                <p style={{ fontSize: 12, color: '#666' }}>Live Preview:</p>
                <img src={previewUrl} style={{ height: 120, borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} alt="preview" />
              </div>
            )}
          </div>
          <input style={styles.input} placeholder="Button Text" onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
          <input style={styles.input} placeholder="Disclaimer" onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} />
          <button style={styles.button} onClick={createLanding}>Save Landing</button>
        </div>

        <div style={styles.tableBox}>
          <h3 style={{ textAlign: 'center', marginBottom: 20 }}>Active Landings</h3>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={styles.th}>ID</th><th style={styles.th}>Offer</th><th style={styles.th}>URL</th><th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {landings.map((l) => (
                <tr key={l.id}>
                  <td style={styles.td}>{l.id}</td>
                  <td style={styles.td}>{l.offer_name || "Default Offer"}</td>
                  <td style={{ ...styles.td, maxWidth: 250, wordBreak: "break-all" }}>{l.landing_url}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                      <button style={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(l.landing_url); alert("Copied"); }}>Copy</button>
                      <a href={l.landing_url} target="_blank" rel="noreferrer"><button style={styles.openBtn}>Open</button></a>
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
  container: { padding: "100px 50px", background: "#f1f5f9", minHeight: "100vh" },
  form: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 15, marginBottom: 40, background: "#fff", padding: 25, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  input: { padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, outline: 'none' },
  button: { gridColumn: "span 3", padding: 15, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" },
  tableBox: { background: "#fff", padding: 25, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: 12, borderBottom: '2px solid #f1f5f9', textAlign: 'center', color: '#64748b' },
  td: { padding: 15, borderBottom: '1px solid #f1f5f9', textAlign: 'center', verticalAlign: 'middle' },
  copyBtn: { padding: "6px 12px", background: "#000", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" },
  openBtn: { padding: "6px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }
};
