import React from "react";
import { motion } from "framer-motion";

export function KpiCard({ icon: Icon, label, value, tone = "cyan" }) {
  const color = tone === "green" ? "text-mint" : tone === "purple" ? "text-violet" : tone === "red" ? "text-danger" : "text-cyan";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="mt-3 block text-xs text-slate-400">{label}</span>
      <strong className="mt-1 block text-2xl text-white">{value}</strong>
    </motion.div>
  );
}
