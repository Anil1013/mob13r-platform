import React, { useState } from 'react';
import apiClient from '../api/apiClient';

export default function QueryConsole({ open, onClose }) {
  const [sql, setSql] = useState('SELECT * FROM publishers;');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/query', { sql });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-3xl shadow">
        <h2 className="font-semibold text-xl mb-2">Database Query Console</h2>
        <textarea
          rows={6}
          value={sql}
          onChange={e => setSql(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <div className="mt-3 flex gap-3">
          <button
            onClick={run}
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run'}
          </button>
          <button onClick={onClose} className="border px-4 py-2 rounded">
            Close
          </button>
        </div>

        {error && <div className="text-red-600 mt-3">{error}</div>}
        {result && (
          <pre className="bg-gray-100 p-3 mt-3 max-h-64 overflow-auto text-sm">
            {JSON.stringify(result.rows, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
