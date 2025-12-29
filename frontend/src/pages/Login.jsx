import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://backend.mob13r.com";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login failed");
      }

      // ✅ Save auth data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem(
        "token_expiry",
        Date.now() + data.expiresIn * 1000
      );

      // ✅ Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.card}>
        {/* ✅ Logo from public folder */}
        <img
          src="/logo.png"
          alt="Mob13r Logo"
          style={styles.logo}
        />

        <h2 style={styles.title}>Admin Login</h2>

        {error && <p style={styles.error}>{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

/* ---------------- styles ---------------- */

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a"
  },
  card: {
    width: "100%",
    maxWidth: "360px",
    padding: "30px",
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    textAlign: "center"
  },
  logo: {
    width: "120px",
    marginBottom: "20px"
  },
  title: {
    marginBottom: "20px",
    color: "#0f172a"
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px"
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    cursor: "pointer"
  },
  error: {
    color: "#dc2626",
    marginBottom: "12px",
    fontSize: "14px"
  }
};
