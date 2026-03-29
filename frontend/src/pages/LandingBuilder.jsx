import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function LandingBuilder() {
  const [form, setForm] = useState({
    publisher_offer_id: "",
    title: "",
    description: "",
    image_url: "",
    button_text: "Subscribe",
    disclaimer: "",
  });

  const [offers, setOffers] = useState([]);
  const [landingId, setLandingId] = useState(null);

  /* 🔥 FETCH OFFERS */
  useEffect(() => {
    fetch(`${API_BASE}/api/landing/publisher-offers`)
      .then((res) => res.json())
      .then((res) => {
        console.log("OFFERS:", res);
        setOffers(res.data || []);
      })
      .catch(console.error);
  }, []);

  /* 🔥 SAVE LANDING */
  const save = async () => {
    if (!form.publisher_offer_id) return alert("Select Offer");

    try {
      const res = await fetch(`${API_BASE}/api/landing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      console.log("FULL RESPONSE:", data);

      // 🔥 SAFE ID EXTRACTION (handles all cases)
      const landing_id = data.id || data?.data?.id;

      if (data.status === "SUCCESS" && landing_id) {
        setLandingId(landing_id);

        alert(
          `Landing Created:\n${window.location.origin}/lp/${landing_id}`
        );
      } else {
        alert("Failed: ID not returned");
      }
    } catch (err) {
      console.error(err);
      alert("Server Error");
    }
  };

  return (
    <>
      <Navbar />

      <div style={styles.container}>
        <div style={styles.left}>
          <h2>Create Landing</h2>

          {/* 🔥 DROPDOWN */}
          <select
            style={styles.input}
            value={form.publisher_offer_id}
            onChange={(e) =>
              setForm({
                ...form,
                publisher_offer_id: Number(e.target.value),
              })
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
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />

          <input
            style={styles.input}
            placeholder="Description"
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <input
            style={styles.input}
            placeholder="Image URL"
            onChange={(e) =>
              setForm({ ...form, image_url: e.target.value })
            }
          />

          <input
            style={styles.input}
            placeholder="Button Text"
            onChange={(e) =>
              setForm({ ...form, button_text: e.target.value })
            }
          />

          <textarea
            style={styles.input}
            placeholder="Disclaimer"
            onChange={(e) =>
              setForm({ ...form, disclaimer: e.target.value })
            }
          />

          <button style={styles.button} onClick={save}>
            Save Landing
          </button>

          {/* 🔥 URL DISPLAY */}
          {landingId && (
            <div style={styles.url}>
              URL: {window.location.origin}/lp/{landingId}
            </div>
          )}
        </div>

        {/* 🔥 PREVIEW */}
        <div style={styles.preview}>
          <div style={styles.card}>
            <h2>{form.title || "Landing Title"}</h2>
            <p>{form.description || "Description..."}</p>

            {form.image_url && (
              <img src={form.image_url} alt="" style={styles.image} />
            )}

            <button style={styles.cta}>
              {form.button_text || "Subscribe"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* 🔥 STYLES */
const styles = {
  container: {
    display: "flex",
    padding: "80px 30px",
    gap: 40,
    background: "#f3f4f6",
    minHeight: "100vh",
  },
  left: {
    width: "40%",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    width: "100%",
  },
  button: {
    padding: 12,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  url: {
    marginTop: 10,
    color: "green",
    fontWeight: "bold",
  },
  preview: { width: "60%" },
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
  },
  cta: {
    marginTop: 10,
    padding: 12,
    width: "100%",
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
  },
  image: {
    width: "100%",
    borderRadius: 8,
    marginTop: 10,
  },
};
