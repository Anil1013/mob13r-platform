import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🌓 Detect Dark Mode for Logo
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    setIsDarkMode(theme === "dark");
  }, []);

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
        navigate("/advertisers");
      } else {
        setError("❌ Invalid login response.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err?.response?.data?.error || "❌ Incorrect credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {/* 🌟 Responsive, Dark-Mode Smart Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={isDarkMode ? "/logo-dark.png" : "/logo-light.png"}
            alt="Mob13r"
            className="h-16 w-auto"
          />
        </div>

        <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-100">
          Welcome to Mob13r Admin
        </h2>

        {error && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-100 dark:bg-red-900/30 py-2 rounded">
            {error}
          </p>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            className="w-full p-3 mt-1 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="mb-5 relative">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            className="w-full p-3 mt-1 pr-12 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 bottom-3 text-gray-500 dark:text-gray-300"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-medium transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Mobile Footer */}
        <p className="text-xs text-center mt-4 text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Mob13r. All Rights Reserved.
        </p>
      </form>
    </div>
  );
}
