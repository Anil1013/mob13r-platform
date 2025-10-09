import React from "react";

function Header() {
  const name = process.env.REACT_APP_APP_NAME || "Mob13r.api";
  return (
    <header style={{ marginBottom: 10 }}>
      <h1 style={{ margin: 0 }}>{name} — Dashboard</h1>
      <p style={{ margin: 0, opacity: 0.7 }}>Dark mode theme</p>
    </header>
  );
}

export default Header;
