// File: frontend/src/components/ui/input.jsx
import React from "react";

export function Input({ className = "", ...props }) {
  return (
    <input
      className={
        "border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 " +
        "focus:ring-2 focus:ring-blue-500 outline-none transition w-full " +
        className
      }
      {...props}
    />
  );
}
