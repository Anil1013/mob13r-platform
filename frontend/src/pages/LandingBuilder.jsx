import { useState } from "react";
import Navbar from "../components/Navbar";

export default function LandingBuilder() {
  const [form, setForm] = useState({});

  const save = async () => {
    await fetch("/api/landing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    alert("Saved");
  };

  return (
    <>
      <Navbar />

      <div style={{ padding: 20 }}>
        <h2>Create Landing</h2>

        <input placeholder="Publisher Offer ID"
          onChange={e=>setForm({...form, publisher_offer_id:e.target.value})} />

        <input placeholder="Title"
          onChange={e=>setForm({...form, title:e.target.value})} />

        <input placeholder="Description"
          onChange={e=>setForm({...form, description:e.target.value})} />

        <input placeholder="Image URL"
          onChange={e=>setForm({...form, image_url:e.target.value})} />

        <input placeholder="Button Text"
          onChange={e=>setForm({...form, button_text:e.target.value})} />

        <textarea placeholder="Disclaimer"
          onChange={e=>setForm({...form, disclaimer:e.target.value})} />

        <button onClick={save}>Save</button>
      </div>
    </>
  );
}
