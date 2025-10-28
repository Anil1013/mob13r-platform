import React, { useState } from "react";
import QueryConsole from "../components/QueryConsole";

export default function Dashboard() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-700">Overview</h2>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded"
          onClick={() => setOpen(true)}
        >
          Open Query Console
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card title="Publishers" count="34" color="indigo" />
        <Card title="Advertisers" count="22" color="green" />
        <Card title="Offers" count="45" color="yellow" />
        <Card title="Conversions" count="87" color="purple" />
      </div>

      <QueryConsole open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

const Card = ({ title, count, color }) => (
  <div
    className={`bg-white rounded-lg shadow p-6 text-center border-t-4 border-${color}-500`}
  >
    <h3 className="text-gray-600 text-lg">{title}</h3>
    <p className={`text-${color}-600 text-3xl font-bold mt-2`}>{count}</p>
  </div>
);
