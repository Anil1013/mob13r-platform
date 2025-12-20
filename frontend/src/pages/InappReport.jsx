import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function InappReport() {
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [pubId, setPubId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/reports/inapp", {
        params: { from, to, pub_id: pubId },
      });
      setRows(res.data || []);
    } catch (e) {
      alert("Failed to load INAPP report");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div>
      <h2>📊 INAPP Report</h2>

      <div style={{ marginBottom: 10 }}>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        <input placeholder="PUB_ID" value={pubId} onChange={e => setPubId(e.target.value)} />
        <button onClick={fetchReport}>Search</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              {rows[0] && Object.keys(rows[0]).map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {Object.values(r).map((v, j) => (
                  <td key={j}>{v ?? "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
