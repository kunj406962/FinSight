import React from "react";

interface AlertProps {
  type: "success" | "error" | "info";
  message: string;
}

export const Alert: React.FC<AlertProps> = ({ type, message }) => {
  const styles = {
    success:
      "bg-emerald-950/40 border-emerald-800/60 text-emerald-300 icon-emerald-400",
    error: "bg-rose-950/40 border-rose-800/60 text-rose-300 icon-rose-400",
    info: "bg-sky-950/40 border-sky-800/60 text-sky-300 icon-sky-400",
  };

  return (
    <div className={`p-3 border rounded-md text-xs flex items-start gap-2.5 ${styles[type]}`}>
      <span className="shrink-0 mt-0.5">
        {type === "error" && "⚠️"}
        {type === "success" && "✓"}
        {type === "info" && "ℹ"}
      </span>
      <div className="leading-relaxed">{message}</div>
    </div>
  );
};