// File: frontend/src/components/ui/card.jsx
// Clean, accessible Card components (no dependencies)

import React from "react";

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={
        "rounded-2xl border border-gray-200 bg-white dark:bg-gray-900 shadow-sm " +
        className
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  return (
    <div
      className={
        "p-4 border-b border-gray-100 dark:border-gray-800 " + className
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }) {
  return (
    <h3
      className={"text-lg font-semibold leading-tight " + className}
      {...props}
    >
      {children || "Untitled"}
    </h3>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return <div className={"p-4 " + className} {...props}>{children}</div>;
}
