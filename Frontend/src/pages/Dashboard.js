import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}`).then((res) => setData(res.data));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dashboard</h2>
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading API response...</p>
      )}
    </div>
  );
}
