import React from "react";

export default function ApiDocs() {
  const baseURL = "https://backend.mob13r.com/api";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Publisher API Documentation</h2>

      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-3">Authentication</h3>

        <p className="text-gray-600 dark:text-gray-300 mb-3">
          Authentication uses <b>JWT token</b>. First login:
        </p>

        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto">
POST {baseURL}/auth/login
{`{
  "username": "admin",
  "password": "yourpassword"
}`}
        </pre>

        <p className="text-gray-600 dark:text-gray-300 mt-3">
          Response:
        </p>

        <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-auto">
{`{
  "token": "YOUR_JWT_TOKEN"
}`}
        </pre>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">API Usage</h3>

        <p className="text-gray-600 dark:text-gray-300 mb-3">
          Add token in each request:
        </p>

        <pre className="bg-gray-900 text-yellow-300 p-4 rounded text-sm overflow-auto">
Authorization: Bearer YOUR_TOKEN
        </pre>

        <h4 className="text-lg font-semibold mt-4 mb-2">Endpoints</h4>

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
