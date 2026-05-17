import React from "react";
import { cn } from "../../utils/cn";

export function Button({ className, variant = "default", ...props }) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "border-0 bg-gradient-to-r from-cyan via-mint to-lime-200 text-slate-950 shadow-[0_0_28px_rgba(88,255,241,.2)] hover:scale-[1.01]",
        variant === "ghost" && "border border-line bg-white/0 text-slate-200 hover:bg-white/10",
        variant === "danger" && "border border-danger/40 bg-danger/15 text-red-100 hover:bg-danger/25",
        variant === "default" && "border border-line bg-white/5 text-slate-100 hover:border-cyan/70 hover:bg-white/10",
        className
      )}
      {...props}
    />
  );
}
