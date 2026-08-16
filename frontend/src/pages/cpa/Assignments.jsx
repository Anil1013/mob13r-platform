import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { btn, btnRed, input, table, th, td, badge, pageTitle } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function Assignments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  const verticalId = searchParams.get("vertical_id") || "";
  const [assignments, setAssignments] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [groups, setGroups] = useState([]);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetType, setTargetType] = useState("campaign");
  const [form, setForm] = useState({ affiliate_id: "", target_id: "", publisher_payout: "", hold_percent: "0" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    load(); loadAffiliates(); loadCampaigns(); loadGroups();
  }, [searchParams.get("vertical_id")]);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const params = verticalId ? `?vertical_id=${verticalId}` : "";
      const res = await fetch(`${API_BASE}/api/publisher-assignments${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setAssignments(data.data);
      else showToast(data.message || "Failed to load assignments", "error");
    } catch {
      showToast("Network error while loading assignments", "error");
    }
  };
  const loadAffiliates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/affiliates`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setAffiliates(data.data);
    } catch { /* non-blocking */ }
  };
  const loadCampaigns = async () => {
    try {
      const vParam = verticalId ? `&vertical_id=${verticalId}` : "";
      const res = await fetch(`${API_BASE}/api/campaigns?status=active${vParam}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setCampaigns(data.data);
    } catch { /* non-blocking */ }
  };
  const loadGroups = async () => {
    try {
      const vParam = verticalId ? `?vertical_id=${verticalId}` : "";
      const res = await fetch(`${API_BASE}/api/campaign-groups${vParam}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setGroups(data.data.filter(g => g.status === "active"));
    } catch { /* non-blocking */ }
  };

  const create = async () => {
    if (!form.affiliate_id) return showToast("Select a publisher", "error");
    if (!form.target_id) return showToast(targetType === "campaign" ? "Select a campaign" : "Select a traffic group", "error");
    if (form.publisher_payout === "" || isNaN(Number(form.publisher_payout)) || Number(form.publisher_payout) < 0) {
      return showToast("Publisher payout must be a positive number", "error");
    }
    const hold = Number(form.hold_percent) || 0;
    if (hold < 0 || hold > 100) return showToast("Hold % must be between 0 and 100", "error");

    setSaving(true);
    try {
      const body = {
        affiliate_id: form.affiliate_id,
        publisher_payout: Number(form.publisher_payout),
        hold_percent: hold,
        ...(targetType === "campaign" ? { campaign_id: form.target_id } : { group_id: form.target_id }),
      };
      const res = await fetch(`${API_BASE}/api/publisher-assignments`, { method: "POST", headers: authHeaders, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        load();
        setForm({ affiliate_id: "", target_id: "", publisher_payout: "", hold_percent: "0" });
        setShowForm(false);
        showToast("Publisher assigned");
      } else {
        showToast(data.message || "Failed to create assignment", "error");
      }
    } catch {
      showToast("Network error while creating assignment", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (a) => {
    const ns = a.status === "active" ? "paused" : "active";
    const prev = assignments;
    setAssignments(l => l.map(x => x.id === a.id ? { ...x, status: ns } : x));
    try {
      const res = await fetch(`${API_BASE}/api/publisher-assignments/${a.id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ status: ns }) });
      if (!res.ok) { setAssignments(prev); showToast("Failed to update status", "error"); }
    } catch {
      setAssignments(prev);
      showToast("Network error", "error");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this assignment? The publisher will fall back to receiving the full advertiser payout with no hold.")) return;
    const prev = assignments;
    setAssignments(l => l.filter(x => x.id !== id));
    try {
      const res = await fetch(`${API_BASE}/api/publisher-assignments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setAssignments(prev); showToast("Failed to remove assignment", "error"); }
      else showToast("Assignment removed");
    } catch {
      setAssignments(prev);
      showToast("Network error while removing assignment", "error");
    }
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({ publisher_payout: a.publisher_payout, hold_percent: a.hold_percent });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async (a) => {
    if (editForm.publisher_payout === "" || isNaN(Number(editForm.publisher_payout)) || Number(editForm.publisher_payout) < 0) {
      return showToast("Publisher payout must be a positive number", "error");
    }
    const hold = Number(editForm.hold_percent) || 0;
    if (hold < 0 || hold > 100) return showToast("Hold % must be between 0 and 100", "error");

    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/api/publisher-assignments/${a.id}`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ publisher_payout: Number(editForm.publisher_payout), hold_percent: hold }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setAssignments(list => list.map(x => x.id === a.id ? { ...x, publisher_payout: data.data.publisher_payout, hold_percent: data.data.hold_percent } : x));
        cancelEdit();
        showToast("Assignment updated");
      } else {
        showToast(data.message || "Failed to update assignment", "error");
      }
    } catch {
      showToast("Network error while updating assignment", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: toast.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontSize: 13, maxWidth: 400 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Assignments</h1>
          <p style={{ color: "#9b7faa", fontSize: 13 }}>Assign a publisher to a campaign or traffic group — their payout and hold % live here</p>
          {verticalId && <p style={{ color: "#9b7faa", fontSize: 12, marginTop: 2 }}>Filtered to the vertical selected in the sidebar — click it again to clear.</p>}
        </div>
        <button style={btn} onClick={() => setShowForm(s => !s)}>{showForm ? "Cancel" : "+ New Assignment"}</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" checked={targetType === "campaign"} onChange={() => { setTargetType("campaign"); setForm(f => ({ ...f, target_id: "" })); }} />
              Assign to a single Campaign
            </label>
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" checked={targetType === "group"} onChange={() => { setTargetType("group"); setForm(f => ({ ...f, target_id: "" })); }} />
              Assign to a Traffic Group
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            <select style={input} value={form.affiliate_id} onChange={e => setForm(f => ({ ...f, affiliate_id: e.target.value }))}>
              <option value="">Select Publisher *</option>
              {affiliates.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            {targetType === "campaign" ? (
              <select style={input} value={form.target_id} onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}>
                <option value="">Select Campaign *</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} — {c.currency} {c.payout} ({c.advertiser_name})</option>)}
              </select>
            ) : (
              <select style={input} value={form.target_id} onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}>
                <option value="">Select Traffic Group *</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} {g.geo ? `(${g.geo}${g.carrier ? "/" + g.carrier : ""})` : ""}</option>)}
              </select>
            )}

            <input style={input} placeholder="Publisher payout (what WE pay them) *" type="number" min="0" step="0.01" value={form.publisher_payout} onChange={e => setForm(f => ({ ...f, publisher_payout: e.target.value }))} />
            <input style={input} placeholder="Hold % (0-100, optional)" type="number" min="0" max="100" step="1" value={form.hold_percent} onChange={e => setForm(f => ({ ...f, hold_percent: e.target.value }))} />
          </div>

          {targetType === "campaign" && form.target_id && (
            <div style={{ fontSize: 11, color: "#9b7faa", marginTop: 8 }}>
              Advertiser pays us <b>{campaigns.find(c => c.id === Number(form.target_id))?.currency} {campaigns.find(c => c.id === Number(form.target_id))?.payout}</b> per conversion — your margin is the difference.
            </div>
          )}
          <div style={{ fontSize: 11, color: "#9b7faa", marginTop: 4 }}>
            Publisher payout can be higher than the advertiser payout — Hold % is how margin is protected in that case (held-back conversions aren't paid out to the publisher, but still count in our own reporting). A red Margin below means this assignment relies on the hold % to stay profitable.
          </div>

          <button style={{ ...btn, marginTop: 14, opacity: saving ? 0.7 : 1 }} onClick={create} disabled={saving}>{saving ? "Creating..." : "Create Assignment"}</button>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Publisher</th>
                <th style={th}>Assigned To</th>
                <th style={th}>Advertiser Payout</th>
                <th style={th}>Publisher Payout</th>
                <th style={th}>Margin</th>
                <th style={th}>Hold %</th>
                <th style={th}>Assignment</th>
                <th style={th}>Campaign/Group Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => {
                const targetStatus = a.campaign_id ? a.campaign_status : a.group_status;
                const targetLive = targetStatus === "active";
                if (editingId === a.id) {
                  return (
                    <tr key={a.id}>
                      <td style={td} colSpan={9}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#9b7faa" }}>{a.affiliate_name} — {a.campaign_id ? a.campaign_name : `${a.group_name} (group)`}</span>
                          <input style={{ ...input, width: 160 }} placeholder="Publisher payout" type="number" min="0" step="0.01" value={editForm.publisher_payout} onChange={e => setEditForm(f => ({ ...f, publisher_payout: e.target.value }))} />
                          <input style={{ ...input, width: 140 }} placeholder="Hold %" type="number" min="0" max="100" step="1" value={editForm.hold_percent} onChange={e => setEditForm(f => ({ ...f, hold_percent: e.target.value }))} />
                          <button style={{ ...btn, opacity: savingEdit ? 0.7 : 1 }} disabled={savingEdit} onClick={() => saveEdit(a)}>{savingEdit ? "Saving..." : "Save"}</button>
                          <button style={btnRed} onClick={cancelEdit}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                <tr key={a.id}>
                  <td style={td}>{a.affiliate_name}</td>
                  <td style={td}>{a.campaign_id ? `📢 ${a.campaign_name}` : `🔀 ${a.group_name} (group)`}</td>
                  <td style={td}>{a.campaign_id ? `${a.currency} ${a.advertiser_payout}` : "varies by campaign"}</td>
                  <td style={td}>{a.currency || ""} {a.publisher_payout}</td>
                  <td style={{ ...td, color: (a.campaign_id && Number(a.advertiser_payout) - Number(a.publisher_payout) < 0) ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
                    {a.campaign_id ? (Number(a.advertiser_payout) - Number(a.publisher_payout)).toFixed(2) : "—"}
                  </td>
                  <td style={td}>{a.hold_percent}%</td>
                  <td style={td}>
                    <span style={badge(a.status === "active" ? "green" : "red")} onClick={() => toggleStatus(a)} title="Click to toggle — this only controls whether WE want this assignment active; it doesn't override the campaign's own paused state below">
                      {a.status === "active" ? "● Active" : "● Paused"}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={badge(targetLive ? "green" : "red")} title="Live status of the underlying campaign/group — traffic actually stops here when paused, regardless of the Assignment toggle">
                      {targetLive ? "● Running" : "⏸ Paused"}
                    </span>
                    {a.status === "active" && !targetLive && (
                      <div style={{ fontSize: 10, color: "#dc2626", marginTop: 4 }}>⚠️ No traffic flowing — {a.campaign_id ? "campaign" : "group"} is paused</div>
                    )}
                  </td>
                  <td style={td}>
                    <button style={{ ...btn, padding: "4px 10px", fontSize: 11, marginRight: 6 }} onClick={() => startEdit(a)}>Edit</button>
                    <button style={{ ...btnRed, padding: "4px 10px", fontSize: 11 }} onClick={() => remove(a.id)}>Remove</button>
                  </td>
                </tr>
                );
              })}
              {!assignments.length && (
                <tr><td style={td} colSpan={9}>No assignments yet — create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
