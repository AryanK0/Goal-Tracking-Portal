import React from "react";
import { BarChart3, Download, GitBranch, Network } from "lucide-react";
import { PageHeader } from "../components/common/AppLayout";
import { Card, CardHeader } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { AnalyticsCharts } from "../components/charts/AnalyticsCharts";
import { ErrorState, LoadingState } from "../components/common/State";
import { useDashboard } from "../hooks/useDashboard";

export default function Analytics() {
  const { data, loading, error } = useDashboard();
  const [department, setDepartment] = React.useState("All");
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  const departments = ["All", ...new Set(data.goals.map((goal) => goal.owner.department))];
  const filteredGoals = department === "All" ? data.goals : data.goals.filter((goal) => goal.owner.department === department);
  const filteredData = { ...data, goals: filteredGoals };
  const risky = [...filteredGoals].sort((a, b) => b.risk_score - a.risk_score).slice(0, 6);
  const shared = data.shared_goals[0];
  const linkedUsers = shared ? JSON.parse(shared.linked_users || "[]").map((id) => data.users.find((user) => user.id === id)?.name || id) : [];
  return (
    <>
      <PageHeader title="Analytics Dashboard" subtitle="Heatmaps, quarter trends, manager effectiveness, goal distribution, and dependency visibility." action={<Button onClick={() => exportAnalytics(filteredGoals)}><Download className="h-4 w-4" /> Export charts</Button>} />
      <div className="grid gap-4">
        <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3 text-sm text-slate-300">
          <span className="font-semibold text-white">Interactive filters</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-lg border border-line bg-black/30 px-3 py-2 text-sm outline-none">{departments.map((item) => <option key={item}>{item}</option>)}</select>
          <span>{filteredGoals.length} goals selected</span>
        </div>
        <AnalyticsCharts data={filteredData} />
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader icon={BarChart3} title="Goal Drift Dashboard" hint="Goals likely to miss target." />
            <div className="grid gap-2">
              {risky.map((goal) => <div key={goal.goal_id} className="rounded-xl border border-line bg-white/5 p-3"><strong className="text-white">{goal.owner.name}</strong><span className="ml-2 text-warning">{goal.risk_score}% risk</span><p className="text-sm text-slate-400">{goal.title}</p></div>)}
            </div>
          </Card>
          <Card>
            <CardHeader icon={Network} title="Goal Dependency Graph" hint="Shared goal ripple effect across linked users." />
            <div className="dependency-graph grid gap-3 text-center text-sm md:grid-cols-4">
              <Node title={shared?.title || "Department KPI"} />
              {linkedUsers.map((name) => <Node key={name} title={name} />)}
            </div>
            <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-warning">This update affects {Math.max(linkedUsers.length, 1)} linked goals.</div>
          </Card>
        </div>
      </div>
    </>
  );
}

function exportAnalytics(goals) {
  const rows = ["Employee,Department,Goal,Progress,Risk", ...goals.map((goal) => [goal.owner.name, goal.owner.department, `"${goal.title.replaceAll('"', '""')}"`, goal.progress, goal.risk_score].join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "momentum-ai-analytics.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function Node({ title }) {
  return <div className="rounded-xl border border-line bg-white/5 p-4"><GitBranch className="mx-auto mb-2 h-5 w-5 text-cyan" />{title}</div>;
}
