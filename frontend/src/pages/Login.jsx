import React, { useState } from "react";
import apiClient from "../api/apiClient";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        navigate("/advertisers");
      } else {
        setError("Invalid login response.");
      }
    } catch (err) {
      if (err?.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to login. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">

      <form
        onSubmit={handleLogin}
        className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-96 border border-white/20"
      >
        {/* LOGO */}
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="Mob13r Logo"
            className="w-32 h-auto drop-shadow-xl"
          />
        </div>

        <h2 className="text-2xl font-bold text-center mb-6 text-white tracking-wide">
          Mob13r Admin Login
        </h2>

        {error && (
          <p className="text-red-400 bg-red-900/20 border border-red-700/30 p-2 rounded mb-4 text-center text-sm">
            ⚠️ {error}
          </p>
        )}

        {/* EMAIL */}
        <input
          className="w-full p-3 rounded-lg mb-4 bg-white/20 border border-white/30 
                     text-white placeholder-gray-300 
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        {/* PASSWORD WITH SHOW/HIDE */}
        <div className="relative mb-4">
          <input
            className="w-full p-3 pr-12 rounded-lg bg-white/20 border border-white/30 
                       text-white placeholder-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* Toggle eye icon */}
          <button
            type="button"
            className="absolute right-3 top-3 text-gray-300 hover:text-white"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* LOGIN BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full p-3 rounded-lg text-lg font-semibold shadow-md transition 
            ${loading ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"}
            text-white`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* FOOTER */}
        <p className="text-center text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} Mob13r Digital Media
        </p>
      </form>
    </div>
  );
}
