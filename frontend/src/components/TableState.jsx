// Shared "loading / empty" table-row state — nicer than plain text.
// Usage: <TableStateRow colSpan={9} loading={loading} loadingText="Loading campaigns..." emptyText="No campaigns yet." emptyIcon="📭" />
export default function TableStateRow({ colSpan, loading, loadingText = "Loading...", emptyText = "No data found.", emptyIcon = "🗂️" }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: "40px 20px", textAlign: "center", border: "none", background: "#fff" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span className="m13-spinner" />
            <span style={{ fontSize: 13, color: "#a888b3", fontFamily: "'Inter',sans-serif" }}>{loadingText}</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 28, opacity: 0.5 }}>{emptyIcon}</span>
            <span style={{ fontSize: 13, color: "#a888b3", fontFamily: "'Inter',sans-serif" }}>{emptyText}</span>
          </div>
        )}
      </td>
    </tr>
  );
}
