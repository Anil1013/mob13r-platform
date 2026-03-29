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
    if (!form.publisher_offer_id) return alert("Select Offer");

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

  /* 🔥 COPY URL */
  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert("Copied!");
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Create Landing</h2>

      {/* 🔥 FORM */}
      <div style={styles.formCard}>
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

          <input name="title" placeholder="Title" onChange={handleChange} style={styles.input} />
          <input name="description" placeholder="Description" onChange={handleChange} style={styles.input} />
          <input name="image_url" placeholder="Image URL" onChange={handleChange} style={styles.input} />
          <input name="button_text" placeholder="Button Text" onChange={handleChange} style={styles.input} />
          <input name="disclaimer" placeholder="Disclaimer" onChange={handleChange} style={styles.input} />
        </div>

        <button onClick={saveLanding} style={styles.saveBtn}>
          Save Landing
        </button>
      </div>

      {/* 🔥 PREVIEW */}
      <div style={styles.preview}>
        <h4>{form.title || "Landing Title"}</h4>

        {form.image_url && (
          <img
            src={form.image_url}
            onError={(e) =>
              (e.target.src =
                "https://via.placeholder.com/150x100?text=No+Image")
            }
            style={styles.image}
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

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Advertiser</th>
              <th>Publisher</th>
              <th>Offer</th>
              <th>Landing URL</th>
            </tr>
          </thead>

          <tbody>
            {landings.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.advertiser_name || "-"}</td>
                <td>{l.publisher_name}</td>
                <td>{l.offer_name}</td>

                <td>
                  <div style={styles.urlBox}>
                    <span style={styles.urlText}>
                      {l.landing_url || "-"}
                    </span>

                    {l.landing_url && (
                      <>
                        <button
                          onClick={() => copyUrl(l.landing_url)}
                          style={styles.copyBtn}
                        >
                          Copy
                        </button>

                        <a
                          href={l.landing_url.replace(
                            "dashboard.mob13r.com",
                            "mob13r.com"
                          )}
                          target="_blank"
                          style={styles.openBtn}
                        >
                          Open
                        </a>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* 🔥 STYLES */
const styles = {
  container: {
    padding: 30,
    background: "#f4f6f9",
    minHeight: "100vh",
  },
  heading: {
    marginBottom: 15,
  },
  formCard: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    marginBottom: 20,
  },
  formRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 15,
  },
  input: {
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 6,
    minWidth: 150,
  },
  saveBtn: {
    padding: "10px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  preview: {
    width: 260,
    padding: 15,
    borderRadius: 10,
    background: "#fff",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    marginBottom: 20,
  },
  image: {
    width: "100%",
    maxHeight: 120,
    objectFit: "cover",
    borderRadius: 6,
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
  tableWrapper: {
    background: "#fff",
    padding: 15,
    borderRadius: 10,
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  urlBox: {
    display: "flex",
    gap: 5,
    alignItems: "center",
  },
  urlText: {
    maxWidth: 200,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
  },
  copyBtn: {
    padding: "4px 8px",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  openBtn: {
    padding: "4px 8px",
    background: "#22c55e",
    color: "#fff",
    borderRadius: 4,
    textDecoration: "none",
  },
};
