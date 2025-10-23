import React from "react";
import { Link } from "react-router-dom";

const Header = () => (
  <nav style={{ background: "#222", padding: "10px" }}>
    <Link to="/" style={{ color: "#fff", marginRight: "15px" }}>Login</Link>
    <Link to="/dashboard" style={{ color: "#fff" }}>Dashboard</Link>
  </nav>
);

export default Header;
