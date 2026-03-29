import { useEffect, useState } from "react";

const API_BASE = "https://backend.mob13r.com";

export default function LandingBuilder() {
  const [offers, setOffers] = useState([]);
  const [landings, setLandings] = useState([]);

  const [form, setForm] = useState({
    publisher_offer_id: "",
    title: "",
    description: "",
    image_url: "",
    button_text: "Subscribe",
    disclaimer: "",
  });

  /* 🔥 FETCH OFFERS */
  useEffect(() => {
       fetch(`${API_BASE}/api/landing/publisher-offers`)
      .then((res) => res.json())
      .then((res) => setOffers(res.data || []));
  }, []);

  /* 🔥 FETCH LANDINGS */
  const loadLandings = () => {
    fetch(`${API_BASE}/api/landing`)
      .then((res) => res.json())
      .then((res) => setLandings(res.data || []));
  };

  useEffect(() => {
    loadLandings();
  }, []);

  /* 🔥 HANDLE CHANGE */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* 🔥 SAVE */
  const saveLanding = async () => {
    const res = await fetch(`${API_BASE}/api/landing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.id) {
      alert("Landing Created");
      loadLandings();
    } else {
      alert("Error");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Create Landing</h2>

      {/* 🔥 HORIZONTAL FORM */}
      <div style={styles.formRow}>
        <select
          name="publisher_offer_id"
          onChange={handleChange}
          style={styles.input}
        >
          <option>Select Offer</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.service_name}
            </option>
          ))}
        </select>

        <input
          name="title"
          placeholder="Title"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="description"
          placeholder="Description"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="image_url"
          placeholder="Image URL"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="button_text"
          placeholder="Button Text"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="disclaimer"
          placeholder="Disclaimer"
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <button onClick={saveLanding} style={styles.saveBtn}>
        Save Landing
      </button>

      {/* 🔥 SMALL PREVIEW */}
      <div style={styles.preview}>
        <h4>{form.title || "Landing Title"}</h4>

        {form.image_url && (
          <img
            src={form.image_url}
            onError={(e) =>
              (e.target.src =
                "https://via.placeholder.com/150x100?text=No+Image")
            }
            style={{ width: "100%", maxHeight: 120, objectFit: "cover" }}
          />
        )}

        <p>{form.description}</p>

        <button style={styles.previewBtn}>
          {form.button_text || "Subscribe"}
        </button>

        <small>{form.disclaimer}</small>
      </div>

      {/* 🔥 TABLE */}
      <h3 style={{ marginTop: 30 }}>Landing Pages</h3>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Advertiser</th>
            <th>Publisher</th>
            <th>Offer</th>
            <th>Landing URL</th>
          </tr>
        </thead>

        <tbody>
          {landings.map((l) => (
            <tr key={l.id}>
              <td>{l.advertiser_name}</td>
              <td>{l.publisher_name}</td>
              <td>{l.offer_name}</td>
              <td>
                <a href={l.landing_url} target="_blank">
                  Open
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* 🔥 STYLES */
const styles = {
  formRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 15,
  },
  input: {
    padding: 8,
    border: "1px solid #ccc",
    borderRadius: 5,
    minWidth: 150,
  },
  saveBtn: {
    padding: "10px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    marginBottom: 20,
  },
  preview: {
    width: 250,
    padding: 15,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
  },
  previewBtn: {
    width: "100%",
    padding: 8,
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    marginTop: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
  },
};
