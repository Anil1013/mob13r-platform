import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function LandingBuilder() {
  const [offers, setOffers] = useState([]);
  const [landings, setLandings] = useState([]);
  const [imageFile, setImageFile] = useState(null); // ✅ Local Image File State

  const [form, setForm] = useState({
    publisher_offer_id: "",
    title: "",
    description: "",
    image_url: "", // Fallback URL
    button_text: "",
    disclaimer: "",
  });

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

  const createLanding = async () => {
    if (!form.publisher_offer_id) return alert("Select offer");

    // ✅ Using FormData to support File Upload
    const formData = new FormData();
    formData.append("publisher_offer_id", form.publisher_offer_id);
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("image_url", form.image_url);
    formData.append("button_text", form.button_text);
    formData.append("disclaimer", form.disclaimer);
    if (imageFile) formData.append("imageFile", imageFile);

    const res = await fetch(`${API_BASE}/api/landing`, {
      method: "POST",
      body: formData, // Sending multipart/form-data
    });

    const data = await res.json();
    if (data.status === "SUCCESS") {
      alert("Landing Created ✅");
      loadLandings();
    } else {
      alert("Error: " + data.error);
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
        <h2 style={{ marginBottom: 20 }}>Create Landing Page</h2>

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

          <input style={styles.input} placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input style={styles.input} placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
          
          <input style={styles.input} placeholder="Or Image URL" onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          
          {/* ✅ New File Upload Input */}
          <div style={{ gridColumn: "span 3", background: "#fff", padding: 10, borderRadius: 5, border: "1px dashed #ccc" }}>
            <label style={{ fontSize: 12, display: "block", marginBottom: 5 }}>Upload Landing Image:</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
          </div>

          <input style={styles.input} placeholder="Button Text" onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
          <input style={styles.input} placeholder="Disclaimer" onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} />

          <button style={styles.button} onClick={createLanding}>Save Landing</button>
        </div>

        <div style={styles.preview}>
          <h4 style={{ margin: "0 0 10px 0" }}>Live Preview:</h4>
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, textAlign: "center" }}>
            {imageFile ? <p style={{ fontSize: 10 }}>Image Selected 📸</p> : <p style={{ fontSize: 10 }}>No Image</p>}
            <h3>{form.title || "Title"}</h3>
            <button style={styles.greenBtn}>{form.button_text || "Subscribe"}</button>
          </div>
        </div>

        <div style={styles.tableBox}>
          <h3>Landing Pages</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Offer</th>
                <th>Publisher</th>
                <th>Landing URL</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {landings.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{l.offer_name}</td>
                  <td>{l.publisher_name}</td>
                  <td style={{ maxWidth: 200, wordBreak: "break-all", fontSize: 12 }}>{l.landing_url}</td>
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
  container: { padding: "100px 30px 30px 30px", background: "#f5f6fa", minHeight: "100vh" },
  form: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 },
  input: { padding: 12, border: "1px solid #ccc", borderRadius: 5 },
  button: { gridColumn: "span 3", padding: 14, background: "#007bff", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: "bold" },
  preview: { width: 300, padding: 20, background: "#fff", borderRadius: 10, marginBottom: 20, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
  greenBtn: { width: "100%", padding: 10, background: "#28a745", color: "#fff", border: "none", borderRadius: 5 },
  tableBox: { background: "#fff", padding: 20, borderRadius: 10, overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 10 },
  copyBtn: { marginRight: 5, padding: "5px 10px", background: "#000", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" },
  openBtn: { padding: "5px 10px", background: "#28a745", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" },
};
