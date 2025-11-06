import React, { useState } from "react";
import apiClient from "../api/apiClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await apiClient.post("/auth/login", { email, password });
      if (res.data.token) {
        localStorage.setItem("mob13r_token", res.data.token); // ✅ Save token
        navigate("/advertisers"); // Redirect after login
      } else {
        setError("Invalid login response");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid credentials");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow w-80">
        <h2 className="text-lg font-bold mb-4">Mob13r Login</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <input
          className="w-full p-2 border rounded mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full p-2 border rounded mb-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white w-full p-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
