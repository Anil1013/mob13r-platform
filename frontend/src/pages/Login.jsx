import React, { useState } from "react";
import apiClient from "../api/apiClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!email.trim() || !password.trim()) {
      return setErr("Email & Password required");
    }

    try {
      const { data } = await apiClient.post("/auth/login", { email, password });

      // ✅ Store token
      localStorage.setItem("mob13r_token", data.token);

      // ✅ Store admin info (optional but useful)
      localStorage.setItem("mob13r_admin", JSON.stringify(data.admin));

      nav("/");
    } catch (e) {
      setErr("Invalid credentials");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form className="bg-white p-6 rounded shadow w-80" onSubmit={submit}>
        <h2 className="text-lg font-bold mb-4">Mob13r Login</h2>
        {err && <p className="text-red-500 text-sm">{err}</p>}

        <input
          className="w-full p-2 border rounded my-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full p-2 border rounded my-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="bg-blue-600 text-white w-full p-2 rounded mt-2">
          Login
        </button>
      </form>
    </div>
  );
}
