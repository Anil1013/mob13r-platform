import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const API_BASE = "https://backend.mob13r.com";

export default function Advertisers() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [list, setList] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", email: "" });
  const [editing, setEditing] = useState(false);

  const token = localStorage.getItem("token");

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

  // CREATE or UPDATE
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

  // EDIT MODE
  const editAdvertiser = (adv) => {
    setForm({
      id: adv.id,
      name: adv.name,
      email: adv.email,
    });
    setEditing(true);
  };

  // TOGGLE STATUS
  const toggleStatus = async (id) => {
    await fetch(`${API_BASE}/api/advertisers/${id}/toggle`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fetchAdvertisers();
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* 🔹 Navbar */}
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

      {/* 🔹 Page Content */}
      <div style={{ padding: 40 }}>
        <h2>Advertisers</h2>

        {/* 🔹 CREATE / EDIT FORM */}
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

        {/* 🔹 LIST TABLE */}
        <table border="1" cellPadding="10" style={{ marginTop: 30 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td
                  style={{
                    color: a.status === "active" ? "green" : "red",
                  }}
                >
                  {a.status}
                </td>
                <td>
                  <button onClick={() => editAdvertiser(a)}>
                    Edit
                  </button>{" "}
                  <button onClick={() => toggleStatus(a.id)}>
                    {a.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const styles = {
  navbar: {
    height: 60,
    backgroundColor: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    cursor: "pointer",
  },
  link: {
    color: "#9ca3af",
    textDecoration: "none",
    fontSize: 14,
  },
  activeLink: {
    color: "#ffffff",
    textDecoration: "underline",
    fontSize: 14,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  user: {
    fontSize: 14,
    opacity: 0.9,
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },
  form: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
};
