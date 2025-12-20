import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    advertiser: "",
    geo: "",
    carrier: "",
    payout: "",
    revenue: "",
    status: "Active",

    execution: {
      landing: { url: "", method: "GET" },
      pinSend: { url: "", method: "POST", params: "" },
      pinVerify: { url: "", method: "POST", params: "" },
      statusCheck: { url: "", method: "GET" },
      portalUrl: "",
      antifraudEnabled: false,
      antifraudScript: "",
    },
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleExecChange = (section, key, value) => {
    setForm({
      ...form,
      execution: {
        ...form.execution,
        [section]: {
          ...form.execution[section],
          [key]: value,
        },
      },
    });
  };

  const saveOffer = () => {
    const newOffer = {
      id: `OFF-${Date.now()}`,
      ...form,
    };
    setOffers([...offers, newOffer]);
    setShowForm(false);
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <div style={styles.topBar}>
            <h2>Offers</h2>
            <button style={styles.createBtn} onClick={() => setShowForm(true)}>
              + Create Offer
            </button>
          </div>

          {/* OFFER LIST */}
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Payout</th>
                <th>Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.name}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>${o.payout}</td>
                  <td>${o.revenue}</td>
                  <td>
                    <span
                      style={{
                        ...styles.badge,
                        background:
                          o.status === "Active" ? "#16a34a" : "#ca8a04",
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* CREATE / EDIT OFFER */}
          {showForm && (
            <div style={styles.card}>
              <h3>Create / Edit Offer</h3>

              <div style={styles.grid}>
                <input placeholder="Offer Name" name="name" onChange={handleChange} />
                <input placeholder="Advertiser" name="advertiser" onChange={handleChange} />
                <input placeholder="Geo" name="geo" onChange={handleChange} />
                <input placeholder="Carrier" name="carrier" onChange={handleChange} />
                <input placeholder="Payout" name="payout" onChange={handleChange} />
                <input placeholder="Revenue" name="revenue" onChange={handleChange} />
              </div>

              <h4>Execution Flow</h4>

              <div style={styles.section}>
                <strong>Landing Page</strong>
                <input
                  placeholder="Landing URL"
                  onChange={(e) =>
                    handleExecChange("landing", "url", e.target.value)
                  }
                />
              </div>

              <div style={styles.section}>
                <strong>PIN Send API</strong>
                <input
                  placeholder="PIN Send URL"
                  onChange={(e) =>
                    handleExecChange("pinSend", "url", e.target.value)
                  }
                />
                <textarea
                  placeholder="Params (JSON)"
                  onChange={(e) =>
                    handleExecChange("pinSend", "params", e.target.value)
                  }
                />
              </div>

              <div style={styles.section}>
                <strong>PIN Verify API</strong>
                <input
                  placeholder="PIN Verify URL"
                  onChange={(e) =>
                    handleExecChange("pinVerify", "url", e.target.value)
                  }
                />
              </div>

              <div style={styles.section}>
                <strong>Status Check API</strong>
                <input
                  placeholder="Status Check URL"
                  onChange={(e) =>
                    handleExecChange("statusCheck", "url", e.target.value)
                  }
                />
              </div>

              <div style={styles.section}>
                <strong>Portal URL</strong>
                <input
                  placeholder="Success Portal URL"
                  onChange={(e) =>
                    setForm({ ...form, execution: { ...form.execution, portalUrl: e.target.value } })
                  }
                />
              </div>

              <label>
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      execution: {
                        ...form.execution,
                        antifraudEnabled: e.target.checked,
                      },
                    })
                  }
                />{" "}
                Enable Anti-Fraud
              </label>

              <button style={styles.saveBtn} onClick={saveOffer}>
                Save Offer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: "24px", color: "#fff" },
  topBar: { display: "flex", justifyContent: "space-between", marginBottom: "16px" },
  createBtn: { background: "#2563eb", color: "#fff", padding: "10px 16px", border: "none", borderRadius: "8px" },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: "24px" },
  badge: { padding: "4px 10px", borderRadius: "999px", color: "#fff" },
  card: { border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" },
  section: { marginTop: "12px" },
  saveBtn: { marginTop: "16px", background: "#16a34a", color: "#fff", padding: "10px", borderRadius: "8px" },
};
