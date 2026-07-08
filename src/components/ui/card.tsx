import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-border bg-white p-6 shadow-sm shadow-black/[0.03] ${className}`}
      {...props}
    />
  );
}
