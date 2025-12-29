import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(
        "https://backend.mob13r.com/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/", { replace: true });
    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        <img src="/logo.png" alt="Mob13r" style={styles.logo} />

        <h2>Admin Login</h2>

        {error && <p style={styles.error}>{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        {/* 🔐 Password with Show / Hide */}
        <div style={styles.passwordBox}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ ...styles.input, marginBottom: 0 }}
          />
          <span
            style={styles.eye}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁️"}
          </span>
        </div>

        <button type="submit" style={styles.button}>
          Login
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },
  card: {
    width: 360,
    padding: 30,
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  logo: {
    width: 80,
    marginBottom: 10,
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 16,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
  },
  passwordBox: {
    position: "relative",
    marginBottom: 16,
  },
  eye: {
    position: "absolute",
    right: 12,
    top: 12,
    cursor: "pointer",
    fontSize: 18,
  },
  button: {
    width: "100%",
    padding: 12,
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 15,
  },
  error: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 10,
  },
};
