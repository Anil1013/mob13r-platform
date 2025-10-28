import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    axios.get("https://backend.mob13r.com/api/health")
      .then(res => setHealth(res.data))
      .catch(() => setHealth({ error: "Backend not reachable" }));
  }, []);

  return (
    <div className="p-4 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-2">Backend Health</h2>
      <pre className="text-gray-700">{JSON.stringify(health, null, 2)}</pre>
    </div>
  );
}
