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
        <h2>Create Landing</h2>
        <div style={styles.form}>
          <select style={styles.input} onChange={(e) => setForm({ ...form, publisher_offer_id: e.target.value })}>
            <option value="">Select Offer</option>
            {offers.map((o) => ( <option key={o.id} value={o.id}>{o.service_name} - {o.publisher_name}</option> ))}
          </select>
          <input style={styles.input} placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input style={styles.input} placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
          
          <div style={{ gridColumn: "span 3", background: "#f8fafc", padding: 15, borderRadius: 8, border: "1px dashed #cbd5e1" }}>
            <label>Upload Image:</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {previewUrl && <img src={previewUrl} style={{ height: 80, marginTop: 10, display: "block" }} alt="preview" />}
          </div>

          <input style={styles.input} placeholder="Button Text" onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
          <input style={styles.input} placeholder="Disclaimer" onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} />
          <button style={styles.button} onClick={createLanding}>Save Landing</button>
        </div>

        <div style={styles.tableBox}>
          <h3>Active Landings</h3>
          <table style={styles.table}>
            <thead><tr><th>ID</th><th>Offer</th><th>URL</th><th>Action</th></tr></thead>
            <tbody>
              {landings.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td><td>{l.offer_name}</td><td>{l.landing_url}</td>
                  <td>
                    <button style={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(l.landing_url); alert("Copied"); }}>Copy</button>
                    {/* ✅ OPEN BUTTON RESTORED */}
                    <a href={l.landing_url} target="_blank" rel="noreferrer"><button style={styles.openBtn}>Open</button></a>
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
  container: { padding: "100px 30px", background: "#f1f5f9", minHeight: "100vh" },
  form: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 15, marginBottom: 30 },
  input: { padding: 12, border: "1px solid #e2e8f0", borderRadius: 8 },
  button: { gridColumn: "span 3", padding: 14, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" },
  tableBox: { background: "#fff", padding: 20, borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse" },
  copyBtn: { padding: "5px 10px", background: "#000", color: "#fff", border: "none", borderRadius: 4, marginRight: 5 },
  openBtn: { padding: "5px 10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 4 }
};
