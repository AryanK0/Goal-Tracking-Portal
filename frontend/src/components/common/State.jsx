import React from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Card } from "./Card";

export function LoadingState({ label = "Loading Momentum AI..." }) {
  return <div className="grid min-h-[55vh] place-items-center text-cyan"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{label}</div>;
}

export function ErrorState({ message }) {
  return <Card className="border-warning/40 bg-warning/10 text-warning"><div className="flex gap-2"><AlertTriangle />{message}</div></Card>;
}

export function EmptyState({ title = "No records yet", message = "Create data to populate this view." }) {
  return <div className="rounded-xl border border-dashed border-line p-8 text-center text-slate-400"><Sparkles className="mx-auto mb-3 h-8 w-8 text-cyan" /><strong className="block text-white">{title}</strong><span>{message}</span></div>;
}
