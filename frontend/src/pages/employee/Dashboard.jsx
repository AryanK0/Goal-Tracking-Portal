import React from "react";
import { Activity, Award, CheckCircle2, Flame, Target } from "lucide-react";
import { PageHeader } from "../../components/common/AppLayout";
import { Card, CardHeader } from "../../components/common/Card";
import { ErrorState, LoadingState } from "../../components/common/State";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { GoalTable } from "../../components/tables/GoalTable";
import { AnalyticsCharts } from "../../components/charts/AnalyticsCharts";
import { useDashboard } from "../../hooks/useDashboard";

export default function EmployeeDashboard() {
  const { data, loading, error, refresh } = useDashboard();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  const goals = data.visible_goals;
  const avg = Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(goals.length, 1));
  const completed = goals.filter((goal) => goal.status === "Completed").length;
  return (
    <>
      <PageHeader title="Employee Dashboard" subtitle="Create goals, track progress, upload evidence, and see AI health signals for your current cycle." />
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <KpiCard icon={Target} label="My goals" value={goals.length} />
        <KpiCard icon={CheckCircle2} label="Average progress" value={`${avg}%`} tone="green" />
        <KpiCard icon={Award} label="Completed" value={completed} tone="purple" />
        <KpiCard icon={Flame} label="Streak" value={`${data.current_user.streak}Q`} tone="red" />
      </div>
      <div className="grid gap-4">
        <AnalyticsCharts data={{ ...data, goals }} />
        <Card>
          <CardHeader icon={Activity} title="Recent Activity" hint="Live workflow timeline from audit and notification events." />
          <div className="grid gap-2">
            {data.audit_logs.slice(0, 5).map((item) => <div key={item.id} className="premium-row rounded-xl border border-line bg-white/5 p-3 text-sm"><strong className="text-white">{item.actor_name}</strong><span className="ml-2 text-cyan">{item.field_changed}</span><p className="text-slate-400">{item.new_value}</p></div>)}
          </div>
        </Card>
        <Card>
          <CardHeader icon={Target} title="My Goal Sheet" hint="All actions are persisted through the FastAPI backend." />
          <GoalTable goals={goals} refresh={refresh} currentUser={data.current_user} cycleState={data.cycle_state} />
        </Card>
      </div>
    </>
  );
}
