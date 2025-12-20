import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function Advertisers() {
  const advertisers = [
    {
      id: 1,
      name: "Shemaroo",
      email: "ops@shemaroo.com",
      status: "Active",
      createdAt: "01 Nov 2024",
    },
    {
      id: 2,
      name: "Zain Kuwait",
      email: "api@zain.com",
      status: "Paused",
      createdAt: "18 Oct 2024",
    },
  ];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <h2 style={styles.title}>Advertisers</h2>
          <p style={styles.subtitle}>
            Manage advertisers, brands, and partners here.
          </p>

          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {advertisers.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td>
                      <span
                        style={{
                          ...styles.status,
                          background:
                            a.status === "Active" ? "#16a34a" : "#ca8a04",
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td>{a.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

const styles = {
  main: {
    flex: 1,
    background: "#020617",
    minHeight: "100vh",
  },
  content: {
    padding: "24px",
    color: "#fff",
  },
  title: {
    fontSize: "24px",
    marginBottom: "4px",
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: "24px",
  },
  card: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  status: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#fff",
  },
};
