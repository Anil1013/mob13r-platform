import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const API_BASE = "https://backend.mob13r.com";

export default function Advertisers() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  const [list, setList] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", email: "" });
  const [editing, setEditing] = useState(false);

  /* 🔍 SEARCH */
  const [search, setSearch] = useState("");

  /* 📄 PAGINATION */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  /* ---------------- FETCH ---------------- */
  const fetchAdvertisers = async () => {
    const res = await fetch(`${API_BASE}/api/advertisers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setList(data || []);
  };

  useEffect(() => {
    fetchAdvertisers();
  }, []);

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

  /* ---------------- EDIT ---------------- */
  const editAdvertiser = (adv) => {
    setForm({
      id: adv.id,
      name: adv.name,
      email: adv.email,
    });
    setEditing(true);
  };

  /* ---------------- TOGGLE STATUS ---------------- */
  const toggleStatus = async (id) => {
    await fetch(`${API_BASE}/api/advertisers/${id}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAdvertisers();
  };

  /* ---------------- LOGOUT ---------------- */
  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  /* ---------------- SEARCH FILTER ---------------- */
  const filteredList = useMemo(() => {
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.email || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [list, search]);

  /* ---------------- PAGINATION ---------------- */
  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedData = filteredList.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <>
      {/* 🔹 NAVBAR */}
      <div style={styles.navbar}>
        <div style={styles.left}>
          <div style={styles.logo} onClick={() => navigate("/dashboard")}>
            Mob13r
          </div>

          <NavLink
            to="/dashboard"
            style={({ isActive }) =>
              isActive ? styles.activeLink : styles.link
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/advertisers"
            style={({ isActive }) =>
              isActive ? styles.activeLink : styles.link
            }
          >
            Advertisers
          </NavLink>
        </div>

        <div style={styles.right}>
          <span style={styles.user}>{user?.email}</span>
          <button style={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* 🔹 PAGE */}
      <div style={styles.page}>
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

        {/* ➕ CREATE / EDIT */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <button type="submit">
            {editing ? "Update" : "Create"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={() => {
                setForm({ id: null, name: "", email: "" });
                setEditing(false);
              }}
            >
              Cancel
            </button>
          )}
        </form>

        {/* 📄 TABLE */}
        <div style={styles.tableWrap}>
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
              {paginatedData.map((a) => (
                <tr key={a.id}>
                  <td style={styles.nameCell}>{a.name}</td>
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
                      {a.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 📄 PAGINATION CONTROLS */}
          <div style={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>

            <span>
              Page {page} of {totalPages || 1}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}

/* 🎨 STYLES */
const styles = {
  navbar: {
    height: 64,
    backgroundColor: "#0f172a",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 28,
  },
  logo: {
    fontSize: 22,
    fontWeight: "700",
    cursor: "pointer",
  },
  link: {
    color: "#cbd5f5",
    textDecoration: "none",
    fontSize: 16,
  },
  activeLink: {
    color: "#ffffff",
    textDecoration: "underline",
    fontSize: 16,
    fontWeight: 600,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },
  user: {
    fontSize: 14,
    opacity: 0.9,
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    cursor: "pointer",
  },
  page: {
    minHeight: "calc(100vh - 64px)",
    padding: "32px 48px",
    backgroundColor: "#f8fafc",
  },
  heading: {
    fontSize: 28,
    marginBottom: 16,
  },
  search: {
    padding: 10,
    width: "320px",
    marginBottom: 20,
  },
  form: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
  },
  tableWrap: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  nameCell: {
    fontSize: 16,
    fontWeight: 600,
  },
  pagination: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 16,
  },
};
