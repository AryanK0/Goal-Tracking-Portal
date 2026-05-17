import React from "react";
import { Filter, Lock, Search } from "lucide-react";
import { PageHeader } from "../components/common/AppLayout";
import { Card, CardHeader } from "../components/common/Card";
import { ErrorState, LoadingState } from "../components/common/State";
import { useDashboard } from "../hooks/useDashboard";

export default function AuditLogs() {
  const { data, loading, error } = useDashboard();
  const [query, setQuery] = React.useState("");
  const [entity, setEntity] = React.useState("All");
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  const entities = ["All", ...new Set(data.audit_logs.map((item) => item.affected_entity).filter(Boolean))];
  const logs = data.audit_logs.filter((item) => {
    const haystack = `${item.actor_name} ${item.field_changed} ${item.old_value} ${item.new_value} ${item.reason} ${item.affected_entity}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (entity === "All" || item.affected_entity === entity);
  });
  return (
    <>
      <PageHeader title="Audit Logs" subtitle="All workflow, approval, unlock, cycle, and update changes are recorded." />
      <Card>
        <CardHeader icon={Lock} title="Governance Trail" hint="Who changed what, from old value to new value, and when." />
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-slate-300"><Search className="h-4 w-4 text-cyan" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audit trail" className="w-full bg-transparent outline-none" /></label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-white/5 px-3 py-2 text-sm text-slate-300"><Filter className="h-4 w-4 text-cyan" /><select value={entity} onChange={(event) => setEntity(event.target.value)} className="w-full bg-transparent outline-none">{entities.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="grid gap-2">
          {logs.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-line bg-white/5 p-3 text-sm md:grid-cols-[150px_150px_1fr_1fr_170px]"><strong>{item.actor_name}</strong><span className="text-cyan">{item.field_changed}</span><span className="text-slate-400">{item.old_value}</span><span className="text-slate-300">{item.new_value}<small className="mt-1 block text-slate-500">{item.reason}</small></span><time className="text-slate-500">{new Date(item.timestamp).toLocaleString()}</time></div>)}
        </div>
      </Card>
    </>
  );
}
