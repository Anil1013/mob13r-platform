// File: frontend/src/components/ui/button.jsx
import React from "react";

export function Button({ className = "", children, ...props }) {
  return (
    <button
      className={
        "px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 " +
        "disabled:opacity-50 disabled:cursor-not-allowed transition " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}
