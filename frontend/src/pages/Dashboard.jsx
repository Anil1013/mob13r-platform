import Navbar from "../components/Navbar";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <>
      {/* ✅ GLOBAL NAVBAR */}
      <Navbar />

      {/* PAGE CONTENT */}
      <div style={styles.container}>
        <h1>Mob13r Dashboard</h1>
        <p>Welcome <b>{user?.email}</b> 👋</p>
        <p>Frontend is live 🚀</p>
      </div>
    </>
  );
}

const styles = {
  container: {
    padding: "80px 40px 40px", // ✅ fixed navbar offset
    fontFamily: "Inter, system-ui, Arial",
  },
};
