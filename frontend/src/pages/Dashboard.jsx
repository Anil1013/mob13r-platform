import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token_expiry");
    navigate("/login");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Mob13r Dashboard</h1>

      <p>
        Welcome <b>{user?.email}</b> 👋
      </p>

      <p>Frontend is live 🚀</p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
