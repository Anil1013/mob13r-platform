import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const API_BASE = "https://backend.mob13r.com";

export default function Advertisers() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [form, setForm] = useState({ id: null, name: "", email: "" });
  const [editing, setEditing] = useState(false);

  const fetchAdvertisers = async () => {
    const res = await fetch(`${API_BASE}/api/advertisers`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setList(data || []);
  };

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  /* ---------------- FILTER + PAGINATION ---------------- */
  const filtered = list.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  /* ---------------- CREATE / UPDATE ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = editing
      ? `${API_BASE}/api/advertisers/${form.id}`
      : `${API_BASE}/api/advertisers`;

    const method = editing ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
      }),
    });

    setForm({ id: null, name: "", email: "" });
    setEditing(false);
    fetchAdvertisers();
  };

  const editAdvertiser = (a) => {
    setForm({ id: a.id, name: a.name, email: a.email });
    setEditing(true);
  };

  const toggleStatus = async (id) => {
    await fetch(`${API_BASE}/api/advertisers/${id}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAdvertisers();
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* 🔹 NAVBAR */}
      <div style={styles.navbar}>
        <div style={styles.left}>
          <div style={styles.logo} onClick={() => navigate("/dashboard")}>
            Mob13r
          </div>

          <NavLink to="/dashboard" style={styles.link}>
            Dashboard
          </NavLink>

          <NavLink to="/advertisers" style={styles.activeLink}>
            Advertisers
          </NavLink>
        </div>

        <div style={styles.right}>
          <span>{user?.email}</span>
          <button style={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* 🔹 PAGE CENTER */}
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.heading}>Advertisers</h1>

          {/* 🔍 SEARCH */}
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={styles.search}
          />

          {/* ➕ FORM */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              placeholder="Name"
              value={form.name}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <button>{editing ? "Update" : "Create"}</button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm({ id: null, name: "", email: "" });
                }}
              >
                Cancel
              </button>
            )}
          </form>

          {/* 📋 TABLE CARD */}
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td>{a.email}</td>
                    <td
                      style={{
                        color: a.status === "active" ? "green" : "red",
                        fontWeight: 600,
                      }}
                    >
                      {a.status}
                    </td>
                    <td>
                      <button onClick={() => editAdvertiser(a)}>Edit</button>{" "}
                      <button onClick={() => toggleStatus(a.id)}>
                        {a.status === "active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 🔢 PAGINATION */}
            <div style={styles.pagination}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages || 1}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= STYLES ================= */
const styles = {
  navbar: {
    height: 64,
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 32px",
  },
  left: { display: "flex", gap: 24, alignItems: "center" },
  logo: { fontSize: 22, fontWeight: "bold", cursor: "pointer" },
  link: { color: "#cbd5f5", textDecoration: "none" },
  activeLink: {
    color: "#fff",
    textDecoration: "underline",
    fontWeight: 600,
  },
  right: { display: "flex", gap: 16, alignItems: "center" },
  logoutBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },

  page: {
    display: "flex",
    justifyContent: "center",
    background: "#f8fafc",
    minHeight: "calc(100vh - 64px)",
    paddingTop: 40,
  },
  container: {
    width: "100%",
    maxWidth: 1000,
    padding: "0 20px",
  },
  heading: { fontSize: 28, marginBottom: 16 },
  search: {
    padding: 10,
    width: 320,
    marginBottom: 16,
  },
  form: {
    display: "flex",
    gap: 10,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  tableCard: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
  },
  pagination: {
    marginTop: 16,
    display: "flex",
    justifyContent: "center",
    gap: 12,
  },
};
