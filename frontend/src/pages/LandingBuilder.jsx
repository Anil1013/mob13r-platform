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

  // ✅ NEW (ADDED - NO CHANGE TO OLD)
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

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

  // ✅ NEW FILE HANDLER (ADDED)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // ✅ NEW URL HANDLER (ADDED)
  const handleUrlChange = (value) => {
    setForm({ ...form, image_url: value });
    setPreview(value);
  };

  // 🔥 CREATE LANDING (UPDATED WITHOUT BREAKING OLD FLOW)
  const createLanding = async () => {
    if (!form.publisher_offer_id) {
      return alert("Select offer");
    }

    // ✅ SWITCH: अगर file है तो FormData use होगा
    if (imageFile) {
      const fd = new FormData();

      Object.keys(form).forEach((k) => fd.append(k, form[k]));
      fd.append("imageFile", imageFile);

      const res = await fetch(`${API_BASE}/api/landing`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (data.status === "SUCCESS") {
        alert("Landing Created ✅");
        loadLandings();
        setPreview("");
        setImageFile(null);
      } else {
        alert("Error creating landing");
      }

      return; // 👈 IMPORTANT (old flow safe)
    }

    // 🔥 OLD FLOW (UNCHANGED)
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

          {/* 🔥 UPDATED (URL + PREVIEW) */}
          <input
            style={styles.input}
            placeholder="Image URL"
            onChange={(e) => handleUrlChange(e.target.value)}
          />

          {/* ✅ NEW FILE INPUT (ADDED) */}
          <input
            style={styles.input}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
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

        {/* 🔥 PREVIEW (UPDATED - OLD + NEW SAFE) */}
        <div style={styles.preview}>
          {preview && (
            <img
              src={preview}
              style={{ width: "100%", height: 120, objectFit: "cover" }}
            />
          )}
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
