import React from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { api, messageFromError } from "../services/api";
import { PageHeader } from "../components/common/AppLayout";
import { Card, CardHeader } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { ErrorState, LoadingState } from "../components/common/State";
import { useDashboard } from "../hooks/useDashboard";
import { useToast } from "../components/common/Toast";

export default function Reports() {
  const { data, loading, error } = useDashboard();
  const [page, setPage] = React.useState(0);
  const toast = useToast();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  const download = async (type) => {
    try {
      const response = await api.get(`/api/reports/achievement.${type}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `momentum-ai-achievement.${type}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.toast(`${type.toUpperCase()} report downloaded`);
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };
  const pageSize = 10;
  const rows = data.goals.slice(page * pageSize, page * pageSize + pageSize);
  const pageCount = Math.max(1, Math.ceil(data.goals.length / pageSize));
  return (
    <>
      <PageHeader title="Reports" subtitle="Export achievement data as CSV or Excel with planned vs actual, progress, risk, and approval state." />
      <Card>
        <CardHeader icon={FileSpreadsheet} title="Achievement Report" hint="Downloadable governance-ready report." />
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => download("csv")}><Download className="h-4 w-4" /> CSV Export</Button>
          <Button onClick={() => download("xlsx")}><Download className="h-4 w-4" /> Excel Export</Button>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
          <span>Windowed table rendering: {rows.length} of {data.goals.length} rows</span>
          <div className="flex gap-2">
            <Button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button>
            <Button disabled={page + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Next</Button>
          </div>
        </div>
        <div className="overflow-auto rounded-xl border border-line">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-white/5 text-slate-300"><tr><th className="p-3">Employee</th><th>Department</th><th>Goal</th><th>Progress</th><th>Risk</th><th>Approval</th></tr></thead>
            <tbody>{rows.map((goal) => <tr key={goal.goal_id} className="premium-row border-t border-line"><td className="p-3">{goal.owner.name}</td><td>{goal.owner.department}</td><td>{goal.title}</td><td>{goal.progress}%</td><td>{goal.risk_score}%</td><td>{goal.visual_state}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
