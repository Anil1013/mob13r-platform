import React from "react";

export default function ApiDocs() {
  const baseURL = "https://backend.mob13r.com/api";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Publisher API Documentation</h2>

      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-3">Authentication</h3>

        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto">
POST {baseURL}/auth/login
{`{
  "username": "admin",
  "password": "Mob13r@123"
}`}
        </pre>

        <p className="mt-2 text-gray-500">Response:</p>

        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto">
{`{
  "token": "JWT_TOKEN"
}`}
        </pre>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">Endpoints</h3>

        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto">
GET {baseURL}/offers
GET {baseURL}/clicks
GET {baseURL}/conversions

POST {baseURL}/click
{`{
  "publisher_id": "123",
  "offer_id": "55",
  "sub1": "value"
}`}
        </pre>
      </div>
    </div>
  );
}
