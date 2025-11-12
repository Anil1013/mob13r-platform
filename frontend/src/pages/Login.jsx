import React, { useState } from "react";
import apiClient from "../api/apiClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post("/auth/login", { email, password });

      if (res.data?.token) {
        localStorage.setItem("mob13r_token", res.data.token);
        localStorage.setItem("mob13r_admin", JSON.stringify(res.data.admin));

        alert("✅ Login successful!");
        navigate("/dashboard", { replace: true });
      } else {
        setError("❌ Invalid login response. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err?.response?.data?.error) {
        setError(`⚠️ ${err.response.data.error}`);
      } else {
        setError("❌ Failed to login. Check your connection or credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow w-80 text-center"
      >
        <h2 className="text-lg font-bold mb-4 text-gray-700">
          Mob13r Admin Login
        </h2>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <input
          className="w-full p-2 border rounded mb-3 focus:outline-none focus:ring focus:border-blue-400"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <input
          className="w-full p-2 border rounded mb-3 focus:outline-none focus:ring focus:border-blue-400"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-2 rounded text-white ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
