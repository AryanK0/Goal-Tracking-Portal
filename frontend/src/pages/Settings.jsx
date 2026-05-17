import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { api, messageFromError } from "../services/api";
import { PageHeader } from "../components/common/AppLayout";
import { Button } from "../components/common/Button";
import { Card, CardHeader } from "../components/common/Card";
import { Field, Input } from "../components/common/Form";
import { ErrorState, LoadingState } from "../components/common/State";
import { useToast } from "../components/common/Toast";
import { useDashboard } from "../hooks/useDashboard";

export default function Settings() {
  const { data, loading, error, refresh } = useDashboard();
  const [form, setForm] = React.useState({ period: "", window_opens: "", action: "", active: true });
  const toast = useToast();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/admin/cycles", form);
      toast.toast("Cycle configured");
      setForm({ period: "", window_opens: "", action: "", active: true });
      await refresh();
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };
  return (
    <>
      <PageHeader title="Settings" subtitle="Cycle configuration, hierarchy sync, Entra ID role mapping, and deployment settings." />
      <Card>
        <CardHeader icon={SettingsIcon} title="Check-in Schedule" hint="BRD quarterly windows enforced by active cycle settings." />
        <div className="mb-4 grid gap-2 md:grid-cols-5">
          {Object.entries(data.cycle_state?.windows || {}).map(([key, value]) => <div key={key} className={`rounded-xl border p-3 text-sm ${value.active ? "border-mint/40 bg-mint/10 text-mint" : "border-line bg-white/5 text-slate-300"}`}><b className="block">{key}</b>{value.active ? "Open now" : value.notice}</div>)}
        </div>
        <div className="grid gap-2">
          {data.cycles.map((cycle) => <div key={cycle.id} className="grid gap-2 rounded-xl border border-line bg-white/5 p-3 md:grid-cols-[220px_120px_1fr_80px]"><strong>{cycle.period}</strong><span className="text-cyan">{cycle.window_opens}</span><span className="text-slate-400">{cycle.action}</span><span className="text-mint">{cycle.active ? "Active" : "Off"}</span></div>)}
        </div>
      </Card>
      <Card className="mt-4">
        <CardHeader icon={SettingsIcon} title="Add Cycle Window" hint="Admin can configure future review windows." />
        <form onSubmit={save} className="grid gap-3 md:grid-cols-3">
          <Field label="Period"><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required /></Field>
          <Field label="Window opens"><Input value={form.window_opens} onChange={(e) => setForm({ ...form, window_opens: e.target.value })} required /></Field>
          <Field label="Action"><Input value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} required /></Field>
          <div className="md:col-span-3"><Button variant="primary">Save Cycle</Button></div>
        </form>
      </Card>
    </>
  );
}
