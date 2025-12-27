export default function Dashboard() {
  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Mob13r Dashboard</h1>
      <p>Frontend is live 🚀</p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
