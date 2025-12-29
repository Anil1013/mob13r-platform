import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function Advertisers() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [list, setList] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", email: "" });
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token");

  /* ---------------- FETCH ---------------- */
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

  /* ---------------- STATUS TOGGLE ---------------- */
  const toggleStatus = async (id) => {
    await fetch(`${API_BASE}/api/advertisers/${id}/toggle`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fetchAdvertisers();
  };

  /* ---------------- SEARCH ---------------- */
  const filteredList = list.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* ✅ GLOBAL NAVBAR */}
      <Navbar />

      {/* PAGE CONTENT */}
      <div style={styles.page}>
        <h2 style={styles.heading}>Advertisers</h2>

        {/* SEARCH + CREATE */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: 8, width: 220 }}
          />

          <input
            type="text"
            placeholder="Name"
            value={form.name}
            required
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
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

        {/* LIST TABLE */}
        <table
          border="1"
          cellPadding="12"
          style={{ marginTop: 20, width: "100%" }}
        >
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((a) => (
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
                  <button onClick={() => editAdvertiser(a)}>
                    Edit
                  </button>{" "}
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
      </div>
    </>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  page: {
    padding: "80px 40px 40px", // ✅ fixed navbar offset
    width: "100%",
    fontFamily: "Inter, system-ui, Arial",
  },
  heading: {
    marginBottom: 16,
  },
  form: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
};
