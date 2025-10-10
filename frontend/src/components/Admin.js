import React, { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    async function fetchData() {
      try {
        const [affRes, partRes] = await Promise.all([
          fetch(`${API_URL}/admin/affiliates`),
          fetch(`${API_URL}/admin/partners`),
        ]);

        const affData = await affRes.json();
        const partData = await partRes.json();

        setAffiliates(affData);
        setPartners(partData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [API_URL]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl">Loading dashboard...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-400">Mob13r.api — Admin Dashboard</h1>
        <span className="text-sm text-gray-400">Dark Mode Theme</span>
      </header>

      {/* Affiliates Table */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-blue-300 mb-4">Affiliates</h2>
        <div className="overflow-x-auto rounded-lg shadow-md bg-gray-800">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-700 text-gray-300 uppercase">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a, i) => (
                <tr key={a.id} className="hover:bg-gray-700 border-b border-gray-700">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{a.name}</td>
                  <td className="p-3">{a.email}</td>
                  <td className="p-3 capitalize">{a.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Partners Table */}
      <section>
        <h2 className="text-2xl font-semibold text-blue-300 mb-4">Partners</h2>
        <div className="overflow-x-auto rounded-lg shadow-md bg-gray-800">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-700 text-gray-300 uppercase">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">API Base</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-700 border-b border-gray-700">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.api_base}</td>
                  <td className="p-3 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        © 2025 Mob13r.api | Admin Control Panel
      </footer>
    </div>
  );
}
