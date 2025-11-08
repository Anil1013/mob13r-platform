import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    template_name: "",
    country_code: "",
    carrier: "",
    api_type: "PIN",
    pin_send_url: "",
    pin_verify_url: "",
    status_check_url: "",
    portal_url: "",
    parameters: '{"msisdn":"string","click_id":"string","pin":"string"}',
    description: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchTemplates = async () => {
    const res = await apiClient.get("/templates");
    setTemplates(res.data || []);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const resetForm = () => {
    setForm({
      template_name: "",
      country_code: "",
      carrier: "",
      api_type: "PIN",
      pin_send_url: "",
      pin_verify_url: "",
      status_check_url: "",
      portal_url: "",
      parameters: '{"msisdn":"string","click_id":"string","pin":"string"}',
      description: "",
    });
    setIsEditing(false);
    setEditId(null);
  };

  const saveTemplate = async () => {
    try {
      const payload = { ...form, parameters: JSON.parse(form.parameters) };
      if (isEditing) {
        await apiClient.put(`/templates/${editId}`, payload);
        alert("✅ Template updated");
      } else {
        await apiClient.post("/templates", payload);
        alert("✅ Template added");
      }
      resetForm();
      fetchTemplates();
    } catch (err) {
      alert("⚠️ " + (err.response?.data?.error || err.message));
    }
  };

  const editTemplate = (t) => {
    setForm({
      ...t,
      parameters: t.parameters ? JSON.stringify(t.parameters, null, 2) : "{}",
    });
    setEditId(t.id);
    setIsEditing(true);
  };

  const deleteTemplate = async (id) => {
    if (window.confirm("Delete this template?")) {
      await apiClient.delete(`/templates/${id}`);
      fetchTemplates();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">INAPP Templates</h2>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <input className="border p-2" placeholder="Template Name" value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} />
        <select className="border p-2" value={form.api_type} onChange={(e) => setForm({ ...form, api_type: e.target.value })}>
          <option value="PIN">PIN</option>
          <option value="CLICK2SMS">Click2SMS</option>
          <option value="PIN_CLICK2SMS">Hybrid (PIN + Click2SMS)</option>
          <option value="DCB">DCB</option>
        </select>
        <input className="border p-2" placeholder="Country Code" value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })} />
        <input className="border p-2" placeholder="Carrier" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
        <input className="border p-2" placeholder="Pin Send URL" value={form.pin_send_url} onChange={(e) => setForm({ ...form, pin_send_url: e.target.value })} />
        <input className="border p-2" placeholder="Pin Verify URL" value={form.pin_verify_url} onChange={(e) => setForm({ ...form, pin_verify_url: e.target.value })} />
        <input className="border p-2" placeholder="Status Check URL" value={form.status_check_url} onChange={(e) => setForm({ ...form, status_check_url: e.target.value })} />
        <input className="border p-2" placeholder="Portal URL" value={form.portal_url} onChange={(e) => setForm({ ...form, portal_url: e.target.value })} />
        <textarea className="border p-2 col-span-2 h-32 font-mono" placeholder="Parameters JSON" value={form.parameters} onChange={(e) => setForm({ ...form, parameters: e.target.value })}></textarea>
        <textarea className="border p-2 col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}></textarea>
      </div>

      <button onClick={saveTemplate} className="bg-blue-600 text-white px-4 py-2 rounded">
        {isEditing ? "Update Template" : "Add Template"}
      </button>
      {isEditing && (
        <button onClick={resetForm} className="ml-2 bg-gray-400 text-white px-4 py-2 rounded">
          Cancel
        </button>
      )}

      <hr className="my-4" />

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Type</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Country</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-2">{t.template_name}</td>
              <td className="p-2">{t.api_type}</td>
              <td className="p-2">{t.carrier}</td>
              <td className="p-2">{t.country_code}</td>
              <td className="p-2 flex gap-2">
                <button onClick={() => editTemplate(t)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                <button onClick={() => deleteTemplate(t.id)} className="bg-red-500 text-white px-3 py-1 rounded">Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
