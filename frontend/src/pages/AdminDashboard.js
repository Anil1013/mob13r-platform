import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.REACT_APP_API_URL || "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("affiliates");

  // ====== DATA ======
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const [offers, setOffers] = useState([]);

  // ====== UI ======
  const [loading, setLoading] = useState(true);

  // Search inputs
  const [searchAff, setSearchAff] = useState("");
  const [searchPart, setSearchPart] = useState("");

  // New forms
  const [newAffiliate, setNewAffiliate] = useState({
    name: "",
    email: "",
    role: "affiliate",
  });
  const [newPartner, setNewPartner] = useState({
    name: "",
    api_base: "",
    status: "active",
  });
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

  // Inline edit states
  const [editAffId, setEditAffId] = useState(null);
  const [editAffData, setEditAffData] = useState({});
  const [editPartId, setEditPartId] = useState(null);
  const [editPartData, setEditPartData] = useState({});
  const [editOfferId, setEditOfferId] = useState(null);
  const [editOfferData, setEditOfferData] = useState({});

  // ====== FETCH ======
  useEffect(() => {
    (async () => {
      try {
        const [affRes, partRes, offRes] = await Promise.all([
          axios.get(`${API_URL}/admin/affiliates`),
          axios.get(`${API_URL}/admin/partners`),
          axios.get(`${API_URL}/admin/offers`),
        ]);
        setAffiliates(affRes.data || []);
        setPartners(partRes.data || []);
        setOffers(offRes.data || []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ====== ADD (CREATE) ======
  const addAffiliate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/admin/affiliates`, newAffiliate);
      setAffiliates((prev) => [...prev, data]);
      setNewAffiliate({ name: "", email: "", role: "affiliate" });
      toast.success("Affiliate added");
    } catch (e) {
      toast.error("Failed to add affiliate");
    }
  };

  const addPartner = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/admin/partners`, newPartner);
      setPartners((prev) => [...prev, data]);
      setNewPartner({ name: "", api_base: "", status: "active" });
      toast.success("Partner added");
    } catch (e) {
      toast.error("Failed to add partner");
    }
  };

  const addOffer = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/admin/offers`, newOffer);
      setOffers((prev) => [...prev, data]);
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
      toast.success("Offer added");
    } catch {
      toast.error("Failed to add offer");
    }
  };

  // ====== EDIT (INLINE SAVE) ======
  const startEditAffiliate = (a) => {
    setEditAffId(a.id);
    setEditAffData({ name: a.name || "", email: a.email || "", role: a.role || "affiliate" });
  };
  const saveAffiliate = async (id) => {
    try {
      const { data } = await axios.patch(`${API_URL}/admin/affiliates/${id}`, editAffData);
      setAffiliates((prev) => prev.map((x) => (x.id === id ? data : x)));
      setEditAffId(null);
      toast.success("Affiliate updated");
    } catch {
      toast.error("Failed to update affiliate");
    }
  };

  const startEditPartner = (p) => {
    setEditPartId(p.id);
    setEditPartData({ name: p.name || "", api_base: p.api_base || "", status: p.status || "active" });
  };
  const savePartner = async (id) => {
    try {
      const { data } = await axios.patch(`${API_URL}/admin/partners/${id}`, editPartData);
      setPartners((prev) => prev.map((x) => (x.id === id ? data : x)));
      setEditPartId(null);
      toast.success("Partner updated");
    } catch {
      toast.error("Failed to update partner");
    }
  };

  const startEditOffer = (o) => {
    setEditOfferId(o.id);
    setEditOfferData({
      name: o.name || "",
      geo: o.geo || "",
      carrier: o.carrier || "",
      partner_id: o.partner_id || o.Partner?.id || "",
      partner_cpa: o.partner_cpa || "",
      status: o.status || "",
    });
  };
  const saveOffer = async (id) => {
    try {
      const { data } = await axios.patch(`${API_URL}/admin/offers/${id}`, editOfferData);
      setOffers((prev) => prev.map((x) => (x.id === id ? data : x)));
      setEditOfferId(null);
      toast.success("Offer updated");
    } catch {
      toast.error("Failed to update offer");
    }
  };

  // ====== DELETE (OFFERS ONLY) ======
  const deleteOffer = async (id) => {
    if (!window.confirm("Delete this offer?")) return;
    try {
      await axios.delete(`${API_URL}/admin/offers/${id}`);
      setOffers((prev) => prev.filter((x) => x.id !== id));
      toast.info("Offer deleted");
    } catch {
      toast.error("Failed to delete offer");
    }
  };

  // ====== FILTERS ======
  const filteredAffiliates = affiliates.filter((a) =>
    `${a.name || ""} ${a.email || ""} ${a.role || ""}`.toLowerCase().includes(searchAff.toLowerCase())
  );
  const filteredPartners = partners.filter((p) =>
    `${p.name || ""} ${p.api_base || ""} ${p.status || ""}`.toLowerCase().includes(searchPart.toLowerCase())
  );

  if (loading)
    return (
      <div style={styles.loadingContainer}>
        <div className="loader"></div>
        <p style={{ color: "#94a3b8", marginTop: 10 }}>Loading Mob13r Dashboard…</p>
        <style>{`
          .loader{border:6px solid #1e293b;border-top:6px solid #4cc9f0;border-radius:50%;width:60px;height:60px;animation:spin 1s linear infinite}
          @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        `}</style>
      </div>
    );

  // ====== RENDERERS ======
  const AffiliatesSection = () => (
    <div style={styles.section}>
      <h2 style={styles.heading}>Affiliates</h2>

      {/* Add Affiliate Form */}
      <form onSubmit={addAffiliate} style={styles.form}>
        <input
          name="name"
          placeholder="Affiliate Name"
          value={newAffiliate.name}
          onChange={(e) => setNewAffiliate((s) => ({ ...s, name: e.target.value }))}
          required
        />
        <input
          name="email"
          placeholder="Email"
          value={newAffiliate.email}
          onChange={(e) => setNewAffiliate((s) => ({ ...s, email: e.target.value }))}
          required
        />
        <select
          name="role"
          value={newAffiliate.role}
          onChange={(e) => setNewAffiliate((s) => ({ ...s, role: e.target.value }))}
        >
          <option value="affiliate">affiliate</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" style={styles.addBtn}>+ Add Affiliate</button>
      </form>

      {/* Search */}
      <input
        style={styles.searchBox}
        placeholder="Search affiliates…"
        value={searchAff}
        onChange={(e) => setSearchAff(e.target.value)}
      />

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 70 }}>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th style={{ width: 150 }}>Role</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAffiliates.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>

                {editAffId === a.id ? (
                  <>
                    <td>
                      <input
                        name="name"
                        value={editAffData.name}
                        onChange={(e) => setEditAffData((s) => ({ ...s, name: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        name="email"
                        value={editAffData.email}
                        onChange={(e) => setEditAffData((s) => ({ ...s, email: e.target.value }))}
                      />
                    </td>
                    <td>
                      <select
                        name="role"
                        value={editAffData.role}
                        onChange={(e) => setEditAffData((s) => ({ ...s, role: e.target.value }))}
                      >
                        <option value="affiliate">affiliate</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <button style={styles.saveBtn} onClick={() => saveAffiliate(a.id)}>💾 Save</button>
                      <button style={styles.cancelBtn} onClick={() => setEditAffId(null)}>✖ Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td>{a.role}</td>
                    <td>
                      <button style={styles.editBtn} onClick={() => startEditAffiliate(a)}>✏ Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const PartnersSection = () => (
    <div style={styles.section}>
      <h2 style={styles.heading}>Partners</h2>

      {/* Add Partner Form */}
      <form onSubmit={addPartner} style={styles.form}>
        <input
          name="name"
          placeholder="Partner Name"
          value={newPartner.name}
          onChange={(e) => setNewPartner((s) => ({ ...s, name: e.target.value }))}
          required
        />
        <input
          name="api_base"
          placeholder="API Base (https://…)"
          value={newPartner.api_base}
          onChange={(e) => setNewPartner((s) => ({ ...s, api_base: e.target.value }))}
          required
        />
        <select
          name="status"
          value={newPartner.status}
          onChange={(e) => setNewPartner((s) => ({ ...s, status: e.target.value }))}
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <button type="submit" style={styles.addBtn}>+ Add Partner</button>
      </form>

      {/* Search */}
      <input
        style={styles.searchBox}
        placeholder="Search partners…"
        value={searchPart}
        onChange={(e) => setSearchPart(e.target.value)}
      />

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 70 }}>ID</th>
              <th>Name</th>
              <th>API Base</th>
              <th style={{ width: 140 }}>Status</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPartners.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>

                {editPartId === p.id ? (
                  <>
                    <td>
                      <input
                        name="name"
                        value={editPartData.name}
                        onChange={(e) => setEditPartData((s) => ({ ...s, name: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        name="api_base"
                        value={editPartData.api_base}
                        onChange={(e) => setEditPartData((s) => ({ ...s, api_base: e.target.value }))}
                      />
                    </td>
                    <td>
                      <select
                        name="status"
                        value={editPartData.status}
                        onChange={(e) => setEditPartData((s) => ({ ...s, status: e.target.value }))}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td>
                      <button style={styles.saveBtn} onClick={() => savePartner(p.id)}>💾 Save</button>
                      <button style={styles.cancelBtn} onClick={() => setEditPartId(null)}>✖ Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{p.name}</td>
                    <td>{p.api_base}</td>
                    <td>{p.status}</td>
                    <td>
                      <button style={styles.editBtn} onClick={() => startEditPartner(p)}>✏ Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const OffersSection = () => (
    <div style={styles.section}>
      <h2 style={styles.heading}>Offers Management</h2>

      {/* Add Offer */}
      <form onSubmit={addOffer} style={styles.form}>
        <input name="name" placeholder="Offer Name" value={newOffer.name} onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })} required />
        <input name="geo" placeholder="Geo" value={newOffer.geo} onChange={(e) => setNewOffer({ ...newOffer, geo: e.target.value })} />
        <input name="carrier" placeholder="Carrier" value={newOffer.carrier} onChange={(e) => setNewOffer({ ...newOffer, carrier: e.target.value })} />
        <select name="partner_id" value={newOffer.partner_id} onChange={(e) => setNewOffer({ ...newOffer, partner_id: e.target.value })} required>
          <option value="">Select Partner</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input name="partner_cpa" placeholder="CPA" value={newOffer.partner_cpa} onChange={(e) => setNewOffer({ ...newOffer, partner_cpa: e.target.value })} />
        <input name="ref_url" placeholder="Ref URL" value={newOffer.ref_url} onChange={(e) => setNewOffer({ ...newOffer, ref_url: e.target.value })} />
        <input name="request_url" placeholder="Request URL" value={newOffer.request_url} onChange={(e) => setNewOffer({ ...newOffer, request_url: e.target.value })} />
        <input name="verify_url" placeholder="Verify URL" value={newOffer.verify_url} onChange={(e) => setNewOffer({ ...newOffer, verify_url: e.target.value })} />
        <button type="submit" style={styles.addBtn}>+ Add Offer</button>
      </form>

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 70 }}>ID</th>
              <th>Name</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>Partner</th>
              <th>CPA</th>
              <th>Status</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>

                {editOfferId === o.id ? (
                  <>
                    <td><input value={editOfferData.name} onChange={(e) => setEditOfferData((s) => ({ ...s, name: e.target.value }))} /></td>
                    <td><input value={editOfferData.geo} onChange={(e) => setEditOfferData((s) => ({ ...s, geo: e.target.value }))} /></td>
                    <td><input value={editOfferData.carrier} onChange={(e) => setEditOfferData((s) => ({ ...s, carrier: e.target.value }))} /></td>
                    <td>
                      <select value={editOfferData.partner_id} onChange={(e) => setEditOfferData((s) => ({ ...s, partner_id: e.target.value }))}>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td><input value={editOfferData.partner_cpa} onChange={(e) => setEditOfferData((s) => ({ ...s, partner_cpa: e.target.value }))} /></td>
                    <td><input value={editOfferData.status} onChange={(e) => setEditOfferData((s) => ({ ...s, status: e.target.value }))} /></td>
                    <td>
                      <button style={styles.saveBtn} onClick={() => saveOffer(o.id)}>💾 Save</button>
                      <button style={styles.cancelBtn} onClick={() => setEditOfferId(null)}>✖ Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{o.name}</td>
                    <td>{o.geo}</td>
                    <td>{o.carrier}</td>
                    <td>{o.Partner?.name}</td>
                    <td>{o.partner_cpa}</td>
                    <td>{o.status}</td>
                    <td>
                      <button style={styles.editBtn} onClick={() => startEditOffer(o)}>✏ Edit</button>
                      <button style={styles.deleteBtn} onClick={() => deleteOffer(o.id)}>🗑 Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" theme="dark" />
      <nav style={styles.navbar}>
        <h1 style={styles.title}>Mob13r Admin Dashboard</h1>
        <div style={styles.navLinks}>
          {["affiliates", "partners", "offers"].map((tab) => (
            <button
              key={tab}
              style={{ ...styles.navButton, ...(activeTab === tab ? styles.activeTab : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "affiliates" && <AffiliatesSection />}
      {activeTab === "partners" && <PartnersSection />}
      {activeTab === "offers" && <OffersSection />}

      <footer style={styles.footer}>
        <p>© 2025 Mob13r Platform — all rights reserved</p>
      </footer>
    </div>
  );
}

const styles = {
  container: { backgrou
