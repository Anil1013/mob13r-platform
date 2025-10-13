import React, { useEffect, useState } from "react";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "http://mob13r-backend-env-1.eba-nj53dyqs.ap-south-1.elasticbeanstalk.com/api";

export default function Admin() {
  const [offers, setOffers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [newOffer, setNewOffer] = useState({
    name: "",
    geo: "",
    carrier: "",
    partner_id: "",
    partner_cpa: "",
    ref_url: "",
    request_url: "",
    verify_url: "",
  });
  const [loading, setLoading] = useState(true);

  // ✅ Fetch existing offers and partners
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [offerRes, partnerRes] = await Promise.all([
          fetch(`${API_URL}/admin/offers`),
          fetch(`${API_URL}/admin/partners`),
        ]);

        const offersData = await offerRes.json();
        const partnersData = await partnerRes.json();

        setOffers(offersData);
        setPartners(partnersData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ Add Offer
  const handleAddOffer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOffer),
      });
      const data = await res.json();

      if (res.ok) {
        setOffers([...offers, data]);
        alert("✅ Offer added successfully!");
        setNewOffer({
          name: "",
          geo: "",
          carrier: "",
          partner_id: "",
          partner_cpa: "",
          ref_url: "",
          request_url: "",
          verify_url: "",
        });
      } else {
        alert("❌ Failed to add offer: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error adding offer:", error);
    }
  };

  // ✅ Delete Offer
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await fetch(`${API_URL}/admin/offers/${id}`, { method: "DELETE" });
      setOffers(offers.filter((o) => o.id !== id));
    } catch (error) {
      console.error("Error deleting offer:", error);
    }
  };

  if (loading)
    return <div style={styles.loading}>🚀 Loading Admin Dashboard...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Mob13r Admin — Offer Management</h1>
      <p style={styles.subtitle}>Connected to AWS Backend</p>

      {/* ➕ Add Offer Form */}
      <form style={styles.form} onSubmit={handleAddOffer}>
        <h2>Add New Offer</h2>
        <div style={styles.grid}>
          <input
            placeholder="Offer Name"
            value={newOffer.name}
            onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })}
          />
          <input
            placeholder="Geo"
            value={newOffer.geo}
            onChange={(e) => setNewOffer({ ...newOffer, geo: e.target.value })}
          />
          <input
            placeholder="Carrier"
            value={newOffer.carrier}
            onChange={(e) =>
              setNewOffer({ ...newOffer, carrier: e.target.value })
            }
          />
          <select
            value={newOffer.partner_id}
            onChange={(e) =>
              setNewOffer({ ...newOffer, partner_id: e.target.value })
            }
          >
            <option value="">Select Partner</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            placeholder="CPA"
            value={newOffer.partner_cpa}
            onChange={(e) =>
              setNewOffer({ ...newOffer, partner_cpa: e.target.value })
            }
          />
          <input
            placeholder="Ref URL"
            value={newOffer.ref_url}
            onChange={(e) =>
              setNewOffer({ ...newOffer, ref_url: e.target.value })
            }
          />
          <input
            placeholder="Request URL"
            value={newOffer.request_url}
            onChange={(e) =>
              setNewOffer({ ...newOffer, request_url: e.target.value })
            }
          />
          <input
            placeholder="Verify URL"
            value={newOffer.verify_url}
            onChange={(e) =>
              setNewOffer({ ...newOffer, verify_url: e.target.value })
            }
          />
        </div>
        <button type="submit" style={styles.button}>
          ➕ Add Offer
        </button>
      </form>

      {/* 📋 Offer Table */}
      <section style={styles.section}>
        <h2 style={styles.heading}>All Offers</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Geo</th>
              <th>Partner</th>
              <th>CPA</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td>{offer.id}</td>
                <td>{offer.name}</td>
                <td>{offer.geo}</td>
                <td>{offer.Partner?.name || "N/A"}</td>
                <td>{offer.partner_cpa}</td>
                <td>{offer.status}</td>
                <td>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(offer.id)}
                  >
                    ❌ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#0b1221",
    color: "#e6eef8",
    minHeight: "100vh",
    padding: "40px",
    fontFamily: "system-ui, sans-serif",
  },
  title: {
    fontSize: "2rem",
    color: "#4cc9f0",
    marginBottom: "0",
  },
  subtitle: {
    color: "#aaa",
    marginBottom: "20px",
  },
  form: {
    backgroundColor: "#111b34",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "40px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "10px",
    marginBottom: "10px",
  },
  button: {
    backgroundColor: "#4cc9f0",
    color: "#000",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  deleteBtn: {
    backgroundColor: "#ff4c4c",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  heading: {
    color: "#fff",
    borderBottom: "2px solid #4cc9f0",
    paddingBottom: "10px",
    marginBottom: "15px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  loading: {
    color: "#fff",
    background: "#0b1221",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: "1.5rem",
  },
};
