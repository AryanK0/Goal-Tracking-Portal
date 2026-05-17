import React from "react";
import { cn } from "../../utils/cn";

export function Card({ className, children }) {
  return <section className={cn("glass overflow-hidden rounded-2xl p-5 transition duration-300 hover:border-cyan/40 hover:shadow-[0_28px_90px_rgba(88,255,241,.12)]", className)}>{children}</section>;
}

export function CardHeader({ icon: Icon, title, hint, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 gap-3">
        {Icon && <Icon className="mt-1 h-5 w-5 shrink-0 text-cyan" />}
        <div className="min-w-0">
          <h2 className="break-words text-base font-bold text-white">{title}</h2>
          {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
