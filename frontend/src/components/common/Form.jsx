import React from "react";
import { cn } from "../../utils/cn";

export function Field({ label, error, children }) {
  return (
    <label className="grid gap-1.5 text-sm text-slate-300">
      <span>{label}</span>
      {children}
      {error && <span className="text-xs text-warning">{error}</span>}
    </label>
  );
}

export const inputClass = "focus-ring w-full rounded-lg border border-line bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500";

export function Input(props) {
  return <input className={cn(inputClass, props.className)} {...props} />;
}

export function Textarea(props) {
  return <textarea className={cn(inputClass, "min-h-24 resize-y", props.className)} {...props} />;
}

export function Select({ children, ...props }) {
  return <select className={cn(inputClass, props.className)} {...props}>{children}</select>;
}
