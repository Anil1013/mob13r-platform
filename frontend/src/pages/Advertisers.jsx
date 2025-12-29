import { useEffect, useState } from "react";

const API_BASE = "https://backend.mob13r.com";

export default function Advertisers() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", email: "" });
  const [editing, setEditing] = useState(false);

  const fetchAdvertisers = async () => {
    const res = await fetch(`${API_BASE}/api/advertisers`);
    const data = await res.json();
    setList(data);
  };

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  // CREATE or UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editing) {
      // UPDATE
      await fetch(`${API_BASE}/api/advertisers/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
        }),
      });
    } else {
      // CREATE
      await fetch(`${API_BASE}/api/advertisers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
        }),
      });
    }

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
    });
    fetchAdvertisers();
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Advertisers</h2>

      {/* 🔹 CREATE / EDIT FORM */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <h3>{editing ? "Edit Advertiser" : "Create Advertiser"}</h3>

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
  );
}

const styles = {
  form: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
};
