import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function LandingBuilder() {
  const [offers, setOffers] = useState([]);
  const [landings, setLandings] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState({ publisher_offer_id: "", title: "", description: "", image_url: "", button_text: "", disclaimer: "" });

  useEffect(() => {
    fetch(`${API_BASE}/api/landing/publisher-offers`).then(res => res.json()).then(d => setOffers(d.data || []));
    loadLandings();
  }, []);

  const loadLandings = () => { fetch(`${API_BASE}/api/landing`).then(res => res.json()).then(d => setLandings(d.data || [])); };

  const createLanding = async () => {
    if (!form.publisher_offer_id) return alert("Select offer");
    const fd = new FormData();
    Object.keys(form).forEach(k => fd.append(k, form[k]));
    if (imageFile) fd.append("imageFile", imageFile);

    const res = await fetch(`${API_BASE}/api/landing`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.status === "SUCCESS") { alert("Landing Created ✅"); loadLandings(); }
  };

  const copyUrl = (url) => { navigator.clipboard.writeText(url); alert("Copied ✅"); };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <h2>Create Landing Page</h2>
        <div style={styles.form}>
          <select style={styles.input} value={form.publisher_offer_id} onChange={(e) => setForm({ ...form, publisher_offer_id: e.target.value })}>
            <option value="">Select Offer</option>
            {offers.map((o) => ( <option key={o.id} value={o.id}>{o.service_name} - {o.publisher_name}</option> ))}
          </select>
          <input style={styles.input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input style={styles.input} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input style={styles.input} placeholder="Or Paste Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <div style={{gridColumn: "span 3", background: "#eee", padding: 10, borderRadius: 5}}>
            <label>Upload New Image: </label>
            <input type="file" onChange={(e) => setImageFile(e.target.files[0])} />
          </div>
          <input style={styles.input} placeholder="Button Text" value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
          <input style={styles.input} placeholder="Disclaimer" value={form.disclaimer} onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} />
          <button style={styles.button} onClick={createLanding}>Save Landing</button>
        </div>
        <div style={styles.tableBox}>
          <table style={styles.table}>
            <thead><tr><th>ID</th><th>Offer</th><th>Publisher</th><th>Landing URL</th><th>Action</th></tr></thead>
            <tbody>
              {landings.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td><td>{l.offer_name}</td><td>{l.publisher_name}</td>
                  <td style={{maxWidth: 200, wordBreak: "break-all"}}>{l.landing_url}</td>
                  <td>
                    <button style={styles.copyBtn} onClick={() => copyUrl(l.landing_url)}>Copy</button>
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
  container: { padding: "100px 30px", background: "#f5f6fa", minHeight: "100vh" },
  form: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 },
  input: { padding: 12, border: "1px solid #ccc", borderRadius: 5 },
  button: { gridColumn: "span 3", padding: 14, background: "#007bff", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" },
  tableBox: { background: "#fff", padding: 20, borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse" },
  copyBtn: { marginRight: 5, padding: "5px 10px", background: "#000", color: "#fff", border: "none", borderRadius: 4 },
  openBtn: { padding: "5px 10px", background: "#28a745", color: "#fff", border: "none", borderRadius: 4 }
};
