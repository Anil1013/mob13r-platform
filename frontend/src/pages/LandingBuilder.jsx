import { useEffect, useState } from "react";
import Navbar from "../components/Navbar"; // 👈 Navbar import kiya

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

  // 🔥 LOAD OFFERS + LANDINGS
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

  // 🔥 CREATE LANDING
  const createLanding = async () => {
    if (!form.publisher_offer_id) {
      return alert("Select offer");
    }

    const res = await fetch(`${API_BASE}/api/landing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.status === "SUCCESS") {
      alert("Landing Created ✅");
      loadLandings();
    } else {
      alert("Error creating landing");
    }
  };

  // 🔥 COPY URL
  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert("Copied ✅");
  };

  return (
    <>
      <Navbar /> {/* 👈 Navbar ko component ke top par add kiya */}
      <div style={styles.container}>
        <h2 style={{ marginBottom: 20 }}>Create Landing</h2>

        {/* FORM */}
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
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <input
            style={styles.input}
            placeholder="Description"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <input
            style={styles.input}
            placeholder="Image URL"
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          />

          <input
            style={styles.input}
            placeholder="Button Text"
            onChange={(e) => setForm({ ...form, button_text: e.target.value })}
          />

          <input
            style={styles.input}
            placeholder="Disclaimer"
            onChange={(e) => setForm({ ...form, disclaimer: e.target.value })}
          />

          <button style={styles.button} onClick={createLanding}>
            Save Landing
          </button>
        </div>

        {/* PREVIEW */}
        <div style={styles.preview}>
          <h3>{form.title || "Landing Title"}</h3>
          <button style={styles.greenBtn}>
            {form.button_text || "Subscribe"}
          </button>
        </div>

        {/* TABLE */}
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

                  <td style={{ maxWidth: 250, wordBreak: "break-all" }}>
                    {l.landing_url}
                  </td>

                  <td>
                    <button
                      style={styles.copyBtn}
                      onClick={() => copyUrl(l.landing_url)}
                    >
                      Copy
                    </button>

                    <a
                      href={l.landing_url}
                      target="_blank"
                      rel="noreferrer"
                    >
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

const styles = {
  container: {
    padding: "80px 30px 30px 30px", // 👈 Navbar ke liye top padding (80px) badhayi
    background: "#f5f6fa",
    minHeight: "100vh",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 5,
  },
  button: {
    gridColumn: "span 3",
    padding: 12,
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
  },
  preview: {
    width: 250,
    padding: 20,
    background: "#fff",
    borderRadius: 10,
    marginBottom: 20,
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
  },
  greenBtn: {
    width: "100%",
    padding: 10,
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 5,
  },
  tableBox: {
    background: "#fff",
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
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 4,
  },
};
