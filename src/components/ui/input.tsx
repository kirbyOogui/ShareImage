import { type InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px]
          text-foreground placeholder:text-foreground/40
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
          ${className}`}
        {...props}
      />
    );
  }
);
