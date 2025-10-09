import React, { useEffect, useState } from "react";
import axios from "axios";

function AdminDashboard() {
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const API = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

  useEffect(() => {
    axios.get(`${API}/admin/affiliates`).then(r => setAffiliates(r.data)).catch(()=>{});
    axios.get(`${API}/admin/partners`).then(r => setPartners(r.data)).catch(()=>{});
  }, [API]);

  return (
    <section style={{ padding: 16, background: "#0f1724", borderRadius: 8 }}>
      <h2>Admin Dashboard (Placeholder)</h2>
      <div><strong>Affiliates:</strong> {JSON.stringify(affiliates)}</div>
      <div style={{ marginTop: 8 }}><strong>Partners:</strong> {JSON.stringify(partners)}</div>
    </section>
  );
}

export default AdminDashboard;
