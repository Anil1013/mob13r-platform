import React from "react";

export function Card({ className = "", ...props }) {
  return (
    <div
      className={
        "rounded-2xl border border-gray-200 bg-white dark:bg-gray-900 shadow-sm " +
        className
      }
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return (
    <div
      className={
        "p-4 border-b border-gray-100 dark:border-gray-800 " + className
      }
      {...props}
    />
  );
}

export function CardTitle({ className = "", ...props }) {
  return (
    <h3 className={"text-lg font-semibold " + className} {...props} />
  );
}

export function CardContent({ className = "", ...props }) {
  return (
    <div className={"p-4 " + className} {...props} />
  );
}
