import React from "react";
import { Brain, CheckCircle2, ClipboardCheck, Users } from "lucide-react";
import { api, messageFromError } from "../../services/api";
import { PageHeader } from "../../components/common/AppLayout";
import { Button } from "../../components/common/Button";
import { Card, CardHeader } from "../../components/common/Card";
import { ErrorState, LoadingState } from "../../components/common/State";
import { Field, Input, Select, Textarea } from "../../components/common/Form";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { GoalTable } from "../../components/tables/GoalTable";
import { useToast } from "../../components/common/Toast";
import { useDashboard } from "../../hooks/useDashboard";

export default function ManagerDashboard() {
  const { data, loading, error, refresh } = useDashboard();
  const toast = useToast();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  const pending = data.visible_goals.filter((goal) => goal.approval_status === "Pending Approval" || goal.approval_status === "Returned");
  const team = new Set(data.visible_goals.map((goal) => goal.user_id)).size;
  const summaries = async () => {
    try {
      for (const employeeId of [...new Set(data.visible_goals.map((goal) => goal.user_id))]) {
        await api.post(`/api/ai/manager-summary/${employeeId}`);
      }
      toast.toast("AI summaries generated for team");
      await refresh();
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };
  return (
    <>
      <PageHeader title="Manager Dashboard" subtitle="Review submitted goals, edit target and weightage inline, return for rework, approve and lock." action={<Button variant="primary" onClick={summaries}><Brain className="h-4 w-4" /> Generate Team Summaries</Button>} />
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <KpiCard icon={Users} label="Team members" value={team} tone="purple" />
        <KpiCard icon={ClipboardCheck} label="Pending review" value={pending.length} />
        <KpiCard icon={CheckCircle2} label="Approved goals" value={data.visible_goals.filter((goal) => goal.approval_status === "Approved").length} tone="green" />
        <KpiCard icon={Brain} label="AI insights" value={data.ai_insights.length} tone="red" />
      </div>
      <Card>
        <CardHeader icon={ClipboardCheck} title="Approval Queue" hint="Approve, return, comment, and update check-in status." />
        <GoalTable goals={pending.length ? pending : data.visible_goals} refresh={refresh} currentUser={data.current_user} cycleState={data.cycle_state} mode="approval" />
      </Card>
      <Card className="mt-4">
        <CardHeader icon={Brain} title="AI Insight Feed" hint="Live signals from team progress, completion drift, and workload risk." />
        <div className="grid gap-2 md:grid-cols-2">
          {buildInsights(data).map((item) => <div key={item} className="premium-row rounded-xl border border-line bg-white/5 p-3 text-sm text-slate-300">{item}</div>)}
        </div>
      </Card>
      <SharedGoalBuilder data={data} refresh={refresh} toast={toast} />
    </>
  );
}

function buildInsights(data) {
  const goals = data.visible_goals;
  const completed = goals.filter((goal) => goal.status === "Completed").length;
  const delayed = goals.filter((goal) => goal.risk_score >= 45).length;
  const avg = Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(goals.length, 1));
  return [
    `Team completion is trending at ${avg}% across active goals.`,
    `${completed} goals are already completed for this cycle.`,
    `${delayed} employees need manager attention before the next check-in.`,
    "Shared KPI updates will sync from primary owners to linked employee goals."
  ];
}

function SharedGoalBuilder({ data, refresh, toast }) {
  const team = data.users.filter((user) => user.role === "Employee" && (data.current_user.role === "Admin" || user.manager_id === data.current_user.id));
  const [form, setForm] = React.useState({ title: "Department KPI goal", description: "Shared department KPI linked to employee execution goals.", thrust_area: "Growth", uom_type: "Numeric", target: 100, target_label: "100 units", primary_owner: team[0]?.id || "", linked_users: team.slice(0, 3).map((user) => user.id), weightage: 20 });
  const toggleUser = (id) => {
    setForm((value) => ({ ...value, linked_users: value.linked_users.includes(id) ? value.linked_users.filter((item) => item !== id) : [...value.linked_users, id], primary_owner: value.primary_owner || id }));
  };
  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, target: Number(form.target), weightage: Number(form.weightage), primary_owner: form.primary_owner || form.linked_users[0] };
      const { data: result } = await api.post("/api/goals/shared", payload);
      toast.toast(`Shared goal pushed to ${result.affected_linked_goals} recipients`);
      await refresh();
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };
  return (
    <Card className="mt-4">
      <CardHeader icon={Users} title="Push Shared KPI Goal" hint="Manager/Admin can cascade a department KPI. Recipients may only adjust weightage." />
      <form onSubmit={save} className="grid gap-3 md:grid-cols-3">
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Thrust area"><Input value={form.thrust_area} onChange={(e) => setForm({ ...form, thrust_area: e.target.value })} /></Field>
        <Field label="UoM"><Select value={form.uom_type} onChange={(e) => setForm({ ...form, uom_type: e.target.value })}><option>Numeric</option><option>Percentage</option><option>Timeline</option><option>Zero-based</option></Select></Field>
        <Field label="Target"><Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field>
        <Field label="Target label"><Input value={form.target_label} onChange={(e) => setForm({ ...form, target_label: e.target.value })} /></Field>
        <Field label="Weightage"><Input type="number" min="10" max="100" value={form.weightage} onChange={(e) => setForm({ ...form, weightage: e.target.value })} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Primary owner"><Select value={form.primary_owner} onChange={(e) => setForm({ ...form, primary_owner: e.target.value })}>{team.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select></Field>
        <div className="rounded-xl border border-line bg-white/5 p-3">
          <span className="text-sm text-slate-300">Recipients</span>
          <div className="mt-2 grid max-h-28 gap-1 overflow-auto">
            {team.map((user) => <label key={user.id} className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.linked_users.includes(user.id)} onChange={() => toggleUser(user.id)} />{user.name}</label>)}
          </div>
        </div>
        <div className="md:col-span-3"><Button variant="primary" disabled={!form.linked_users.length}>Push Shared KPI</Button></div>
      </form>
    </Card>
  );
}
