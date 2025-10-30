import React, { useState } from "react";

export default function LandingBuilder() {
  const [banner, setBanner] = useState("");
  const [headline, setHeadline] = useState("Get the best offer now!");
  const [cta, setCta] = useState("Start Now");
  const tracking = "https://backend.mob13r.com/click?pub=123&offer=55";

  const upload = (e) => {
    const f = e.target.files[0];
    const reader = new FileReader();
    reader.onload = e => setBanner(e.target.result);
    reader.readAsDataURL(f);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Landing Page Builder</h2>

      <input type="file" accept="image/*" onChange={upload} className="mb-3"/>

      <input className="border p-2 w-full rounded mb-2"
        value={headline} onChange={e=>setHeadline(e.target.value)} />

      <input className="border p-2 w-full rounded mb-2"
        value={cta} onChange={e=>setCta(e.target.value)} />

      <div className="bg-white dark:bg-gray-800 shadow p-4 rounded">
        <h3 className="font-medium mb-2">Preview</h3>
        <div className="border p-6 text-center rounded">
          {banner && <img src={banner} className="mx-auto mb-3 h-40 object-cover rounded"/>}
          <h4 className="text-xl font-bold mb-2">{headline}</h4>
          <button className="bg-green-600 text-white px-6 py-2 rounded">{cta}</button>
        </div>
      </div>

      <div className="bg-black text-green-400 p-4 rounded text-sm">
        Tracking Link: {tracking}
      </div>
    </div>
  );
}
