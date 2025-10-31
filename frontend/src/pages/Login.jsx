import React, { useState } from "react";
import apiClient from "../api/apiClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await apiClient.post("/auth/login", { username, password });
      localStorage.setItem("mob13r_token", data.token);
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

        <input className="w-full p-2 border rounded my-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setU(e.target.value)}
        />
        <input className="w-full p-2 border rounded my-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setP(e.target.value)}
        />

        <button className="bg-blue-600 text-white w-full p-2 rounded mt-2">
          Login
        </button>
      </form>
    </div>
  );
}
