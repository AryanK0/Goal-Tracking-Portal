import React from "react";

export function ProgressRing({ value, label }) {
  return (
    <div className="grid place-items-center gap-2">
      <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(#58fff1 ${value * 3.6}deg, rgba(255,255,255,.08) 0)` }}>
        <div className="grid h-28 w-28 place-items-center rounded-full bg-surface">
          <strong className="text-3xl text-cyan">{value}</strong>
          <span className="-mt-7 text-xs text-slate-400">/100</span>
        </div>
      </div>
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}
