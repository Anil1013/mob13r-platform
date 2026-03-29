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

  /* 🔥 FETCH OFFERS (FIXED URL) */
  useEffect(() => {
  fetch(`${API_BASE}/api/landing/publisher-offers`)
    .then((res) => res.json())
    .then((res) => {
      console.log("OFFERS:", res);
      setOffers(res.data || []);
    })
    .catch((err) => console.error(err));
}, []);

  /* 🔥 SAVE */
  const save = async () => {
    if (!form.publisher_offer_id) {
      return alert("Select Offer");
    }

    try {
      const res = await fetch(`${API_BASE}/api/landing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      console.log("SAVE RESPONSE:", data);

      if (data.status === "SUCCESS") {
        alert(
          `Landing Created:\n${window.location.origin}/lp/${form.publisher_offer_id}`
        );
      } else {
        alert("Failed: " + (data.message || ""));
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  return (
    <>
      <Navbar />

      <div style={styles.container}>
        <div style={styles.left}>
          <h2>Create Landing</h2>

          <select
            style={styles.input}
            value={form.publisher_offer_id}
            onChange={(e) =>
              setForm({  ...form, publisher_offer_id: Number(e.target.value),
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

          {form.publisher_offer_id && (
            <div style={styles.url}>
              URL: {window.location.origin}/lp/{form.publisher_offer_id}
            </div>
          )}
        </div>

        <div style={styles.preview}>
          <h3>Live Preview</h3>

          <div style={styles.card}>
            <h2>{form.title || "Landing Title"}</h2>
            <p>{form.description || "Landing description..."}</p>

            {form.image_url && (
              <img
                src={form.image_url}
                alt=""
                style={{ width: "100%", borderRadius: 8 }}
              />
            )}

            <button style={styles.cta}>
              {form.button_text || "Subscribe"}
            </button>

            <p style={styles.disclaimer}>
              {form.disclaimer || "Disclaimer text"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* STYLES SAME */
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
    marginTop: 10,
  },
  url: {
    marginTop: 10,
    color: "green",
    fontWeight: "bold",
  },
  preview: {
    width: "60%",
  },
  card: {
    border: "1px solid #ddd",
    padding: 20,
    borderRadius: 10,
    background: "#fff",
  },
  cta: {
    marginTop: 10,
    padding: 12,
    width: "100%",
    background: "#22c55e",
    border: "none",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },
  disclaimer: {
    fontSize: 12,
    marginTop: 10,
    color: "#555",
  },
};
