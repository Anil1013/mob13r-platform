import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ✅ Redirect to Admin Key page if no API key saved
if (!localStorage.getItem("admin_key") && !window.location.pathname.includes("/admin-keys")) {
  window.location.href = "/admin-keys";
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
