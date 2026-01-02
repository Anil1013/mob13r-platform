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

  const [toast, setToast] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});

  const [token, setToken] = useState(null); // ✅ FIX

  /* ================= AUTH GUARD (FIXED) ================= */
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      navigate("/login");
    } else {
      setToken(t);
      loadPublishers(t);
    }
    // eslint-disable-next-line
  }, []);

  /* ================= FETCH ================= */
  const loadPublishers = async (authToken) => {
    const res = await fetch(`${API_BASE}/api/publishers`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (data.status === "SUCCESS") setPublishers(data.data);
  };

  /* ================= TOAST ================= */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  /* ================= ADD ================= */
  const addPublisher = async () => {
    if (!name.trim()) return showToast("Publisher name required");

    setLoading(true);
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
      setPublishers((p) => [...p, data.data]);
      setName("");
      showToast("Publisher added");
    }
    setLoading(false);
  };

  /* ================= COPY ================= */
  const copyApiKey = async (key) => {
    await navigator.clipboard.writeText(key);
    showToast("API key copied");
  };

  /* ================= TOGGLE KEY ================= */
  const toggleKey = (id) => {
    setVisibleKeys((v) => ({ ...v, [id]: !v[id] }));
  };

  /* ================= TOGGLE STATUS ================= */
  const toggleStatus = async (id, status) => {
    const newStatus = status === "active" ? "paused" : "active";

    setPublishers((list) =>
      list.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );

    const res = await fetch(`${API_BASE}/api/publishers/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      setPublishers((list) =>
        list.map((p) => (p.id === id ? { ...p, status } : p))
      );
      showToast("Status update failed");
    }
  };

  return (
    <>
      <Navbar />

      {toast && <div style={toastStyle}>{toast}</div>}

      <div style={{ padding: 20 }}>
        <h2>Publishers</h2>

        {/* ADD */}
        <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Publisher name"
            style={{ padding: 6, width: 250 }}
          />
          <button onClick={addPublisher} disabled={loading}>
            {loading ? "Adding..." : "Add Publisher"}
          </button>
        </div>

        {/* TABLE */}
        <table width="100%" border="1" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Name</th>
              <th style={th}>API Key</th>
              <th style={th}>Status</th>
              <th style={th}>Created</th>
              <th style={th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {publishers.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.id}</td>
                <td style={td}>{p.name}</td>

                <td style={td}>
                  <div style={apiWrap}>
                    <code>
                      {visibleKeys[p.id]
                        ? p.api_key
                        : "••••••••••••••••"}
                    </code>
                    <button type="button" onClick={() => toggleKey(p.id)}>👁</button>
                    <button type="button" onClick={() => copyApiKey(p.api_key)}>📋</button>
                  </div>
                </td>

                <td style={td}>
                  <span
                    style={{
                      ...badge,
                      background:
                        p.status === "active" ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {p.status.toUpperCase()}
                  </span>
                </td>

                <td style={td}>
                  {new Date(p.created_at).toLocaleString()}
                </td>

                {/* ACTIONS */}
                <td style={{ ...td, display: "flex", gap: 8, justifyContent: "center" }}>
                  <button type="button" onClick={() => toggleStatus(p.id, p.status)}>
                    {p.status === "active" ? "Pause" : "Activate"}
                  </button>

                  {/* ✅ ASSIGN OFFERS — NOW SAFE */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/assign-offers?publisherId=${p.id}`)
                    }
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    Assign Offers
                  </button>
                </td>
              </tr>
            ))}

            {!publishers.length && (
              <tr>
                <td colSpan="6" style={td}>
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

/* ================= STYLES ================= */
const th = { padding: 10, textAlign: "center" };
const td = { padding: 10, textAlign: "center" };

const apiWrap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const badge = {
  padding: "4px 12px",
  borderRadius: 20,
  color: "#fff",
  fontWeight: 600,
  fontSize: 12,
};

const toastStyle = {
  position: "fixed",
  top: 20,
  right: 20,
  background: "#111827",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 6,
  zIndex: 9999,
};
