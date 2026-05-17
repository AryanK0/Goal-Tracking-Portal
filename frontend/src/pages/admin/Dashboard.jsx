import React from "react";
import { AlertTriangle, Clock, Lock, Shield, Users, Zap } from "lucide-react";
import { api, messageFromError } from "../../services/api";
import { PageHeader } from "../../components/common/AppLayout";
import { Button } from "../../components/common/Button";
import { Card, CardHeader } from "../../components/common/Card";
import { ErrorState, LoadingState } from "../../components/common/State";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { GoalTable } from "../../components/tables/GoalTable";
import { useToast } from "../../components/common/Toast";
import { useDashboard } from "../../hooks/useDashboard";
import { Field, Input, Select } from "../../components/common/Form";

export default function AdminDashboard() {
  const { data, loading, error, refresh } = useDashboard();
  const toast = useToast();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  const completionRate = Math.round(data.goals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(data.goals.length, 1));
  const recompute = async () => {
    try {
      const { data: result } = await api.post("/api/ai/escalations/recompute");
      toast.toast(`${result.count} escalations recomputed`);
      await refresh();
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };
  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Cycle governance, hierarchy, unlock exceptions, escalation history, and organization-wide completion." action={<Button variant="primary" onClick={recompute}><Zap className="h-4 w-4" /> Recompute Escalations</Button>} />
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <KpiCard icon={Users} label="Employees" value={data.users.filter((user) => user.role === "Employee").length} tone="green" />
        <KpiCard icon={Shield} label="Completion rate" value={`${completionRate}%`} />
        <KpiCard icon={Zap} label="Escalations" value={data.escalations.length} tone="red" />
        <KpiCard icon={Lock} label="Locked goals" value={data.goals.filter((goal) => goal.locked).length} tone="purple" />
      </div>
      <Card>
        <CardHeader icon={Lock} title="Exception Management" hint="Admin-only unlock path with audit logging." />
        <GoalTable goals={data.goals.filter((goal) => goal.locked).slice(0, 12)} refresh={refresh} currentUser={data.current_user} cycleState={data.cycle_state} />
      </Card>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader icon={AlertTriangle} title="Open Escalations" hint="Risk level, days overdue, and escalation chain." />
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <span className="rounded-xl border border-line bg-white/5 p-3 text-sm text-slate-300">Open issues: <b className="text-warning">{data.escalations.filter((item) => item.status === "Open").length}</b></span>
            <span className="rounded-xl border border-line bg-white/5 p-3 text-sm text-slate-300">Resolved issues: <b className="text-mint">{data.escalations.filter((item) => item.status === "Resolved").length}</b></span>
            <span className="rounded-xl border border-line bg-white/5 p-3 text-sm text-slate-300">Overdue count: <b className="text-danger">{data.escalations.filter((item) => item.days_overdue > 0).length}</b></span>
          </div>
          <div className="grid gap-2">
            {data.escalations.slice(0, 8).map((item) => <div key={item.id} className="premium-row rounded-xl border border-line bg-white/5 p-3 text-sm"><strong className="text-white">{item.risk_level} risk</strong><span className="ml-2 text-warning">{item.days_overdue} days overdue</span><span className="ml-2 text-cyan">{item.status}</span><p className="text-slate-400">{item.escalation_level}: {item.reason}</p></div>)}
          </div>
        </Card>
        <Card>
          <CardHeader icon={Clock} title="Unlock History" hint="Admin unlock and re-lock reasons." />
          <div className="grid gap-2">
            {data.unlock_history.slice(0, 8).map((item) => <div key={item.id} className="premium-row rounded-xl border border-line bg-white/5 p-3 text-sm"><strong className="text-white">{item.action}</strong><span className="ml-2 text-cyan">{item.admin_name}</span><p className="text-slate-400">{item.reason}</p></div>)}
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader icon={Zap} title="AI Insights Feed" hint="Submission-ready signals for demo narration." />
        <div className="grid gap-2 md:grid-cols-3">
          <div className="premium-row rounded-xl border border-line bg-white/5 p-3 text-sm text-warning">Goal delayed: {data.escalations.filter((item) => item.status === "Open").length} open risks</div>
          <div className="premium-row rounded-xl border border-line bg-white/5 p-3 text-sm text-cyan">Performance improved: {completionRate}% organization completion</div>
          <div className="premium-row rounded-xl border border-line bg-white/5 p-3 text-sm text-mint">Team exceeded targets: {data.goals.filter((goal) => goal.progress >= 100).length} goals at 100%</div>
        </div>
      </Card>
      <UserManagement data={data} refresh={refresh} toast={toast} />
    </>
  );
}

function UserManagement({ data, refresh, toast }) {
  const [form, setForm] = React.useState({ name: "", email: "", role: "Employee", manager_id: "mgr-1", department: "Sales", workload: 55 });
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/admin/users", form);
      toast.toast("User created");
      setForm({ ...form, name: "", email: "" });
      await refresh();
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };
  return (
    <Card className="mt-4">
      <CardHeader icon={Users} title="Manage Users & Hierarchy" hint="Create users, assign role, department, manager, and workload." />
      <form onSubmit={save} className="grid gap-3 md:grid-cols-3">
        <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
        <Field label="Role"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>Employee</option><option>Manager</option><option>Admin</option></Select></Field>
        <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
        <Field label="Manager"><Select value={form.manager_id || ""} onChange={(e) => setForm({ ...form, manager_id: e.target.value || null })}><option value="">None</option>{data.users.filter((u) => u.role !== "Employee").map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select></Field>
        <Field label="Workload"><Input type="number" value={form.workload} onChange={(e) => setForm({ ...form, workload: Number(e.target.value) })} /></Field>
        <div className="md:col-span-3"><Button variant="primary">Create User</Button></div>
      </form>
    </Card>
  );
}
