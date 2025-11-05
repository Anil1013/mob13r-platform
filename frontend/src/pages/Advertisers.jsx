import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Advertisers() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [ads, setAds] = useState([]);
  const [editId, setEditId] = useState(null);

  const fetchAds = async () => {
    try {
      const res = await apiClient.get("/advertisers");
      setAds(res.data);
    } catch (err) {
      console.error(err);
      alert("❌ Error loading advertisers");
    }
  };

  const saveAdvertiser = async () => {
    if (!name.trim()) return alert("Name required");

    try {
      if (editId) {
        await apiClient.put(`/advertisers/${editId}`, { name, email, website });
        alert("✅ Updated");
      } else {
        await apiClient.post("/advertisers", { name, email, website });
        alert("✅ Added");
      }

      setName(""); setEmail(""); setWebsite(""); setEditId(null);
      fetchAds();
    } catch (err) {
      console.error(err);
      alert("❌ Error saving advertiser");
    }
  };

  const editAdvertiser = (a) => {
    setEditId(a.id);
    setName(a.name);
    setEmail(a.email);
    setWebsite(a.website);
  };

  const deleteAdvertiser = async (id) => {
    if (!window.confirm("Delete this advertiser?")) return;

    try {
      await apiClient.delete(`/advertisers/${id}`);
      alert("🗑️ Deleted");
      fetchAds();
    } catch (err) {
      console.error(err);
      alert("❌ Error deleting");
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-4">Advertisers</h2>

      <div className="grid grid-cols-4 gap-2 max-w-xl mb-4">
        <input className="bord
