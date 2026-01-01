import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function Publishers() {
  const navigate = useNavigate();

  const [publishers, setPublishers] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    if (!token) {
      navigate("/login");
    } else {
      loadPublishers();
    }
    // eslint-disable-next-line
  }, []);

  /* ================= FETCH PUBLISHERS ================= */
  const loadPublishers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/publishers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setPublishers(data.data);
      }
    } catch (err) {
      console.error("LOAD PUBLISHERS ERROR", err);
    }
  };

  /* ================= ADD PUBLISHER ================= */
  const addPublisher = async () => {
    if (!name.trim()) {
      alert("Publisher name required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/publishers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setName("");
        loadPublishers();
      } else {
        alert(data.message || "Failed to add publisher");
      }
    } catch (err) {
      console.error("ADD PUBLISHER ERROR", err);
    }
    setLoading(false);
  };

  /* ================= TOGGLE STATUS ================= */
  const toggleStatus = async (id, status) => {
    try {
      await fetch(`${API_BASE}/api/publishers/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: status === "active" ? "paused" : "active",
        }),
      });

      loadPublishers();
    } catch (err) {
      console.error("TOGGLE STATUS ERROR", err);
    }
  };

  return (
    <>
      <Navbar />

      <div style={{ padding: 20 }}>
        <h2>Publishers</h2>

        {/* ================= ADD PUBLISHER ================= */}
        <div
          style={{
            marginBottom: 20,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Publisher name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 6, width: 250 }}
          />

          <button onClick={addPublisher} disabled={loading}>
            {loading ? "Adding..." : "Add Publisher"}
          </button>
        </div>

        {/* ================= PUBLISHER TABLE ================= */}
        <table
          width="100%"
          cellPadding="10"
          cellSpacing="0"
          border="1"
          style={{ borderCollapse: "collapse" }}
        >
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>API Key</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {publishers.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td style={{ maxWidth: 320 }}>
                  <code style={{ fontSize: 12 }}>{p.api_key}</code>
                </td>
                <td>
                  <span
                    style={{
                      color: p.status === "active" ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {p.status.toUpperCase()}
                  </span>
                </td>
                <td>{new Date(p.created_at).toLocaleString()}</td>
                <td>
                  <button onClick={() => toggleStatus(p.id, p.status)}>
                    {p.status === "active" ? "Pause" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}

            {!publishers.length && (
              <tr>
                <td colSpan="6" align="center">
                  No publishers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
