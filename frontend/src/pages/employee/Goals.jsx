import React from "react";
import { Target } from "lucide-react";
import { PageHeader } from "../../components/common/AppLayout";
import { Card, CardHeader } from "../../components/common/Card";
import { LoadingState, ErrorState } from "../../components/common/State";
import { GoalForm } from "../../components/forms/GoalForm";
import { GoalTable } from "../../components/tables/GoalTable";
import { useDashboard } from "../../hooks/useDashboard";

export default function GoalsPage() {
  const { data, loading, error, refresh } = useDashboard();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  return (
    <>
      <PageHeader title="Goal Creation" subtitle="AI-assisted SMART builder, validation ring, goal-sheet submission, and evidence-backed tracking." />
      <div className="grid gap-4">
        <GoalForm data={data} refresh={refresh} />
        <Card>
          <CardHeader icon={Target} title="Current Goals" hint="Edit draft goals before submission. Locked goals require Admin intervention." />
          <GoalTable goals={data.visible_goals} refresh={refresh} currentUser={data.current_user} cycleState={data.cycle_state} />
        </Card>
      </div>
    </>
  );
}
