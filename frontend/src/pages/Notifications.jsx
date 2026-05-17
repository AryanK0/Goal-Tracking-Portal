import React from "react";
import { Bell, Check } from "lucide-react";
import { api } from "../services/api";
import { PageHeader } from "../components/common/AppLayout";
import { Button } from "../components/common/Button";
import { Card, CardHeader } from "../components/common/Card";
import { ErrorState, LoadingState, EmptyState } from "../components/common/State";
import { useDashboard } from "../hooks/useDashboard";

export default function Notifications() {
  const { data, loading, error, refresh } = useDashboard();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  return (
    <>
      <PageHeader title="Notifications" subtitle="Email, Teams, approval, check-in, and escalation notifications." />
      <Card>
        <CardHeader icon={Bell} title="Notification Center" hint="Teams-like actionable updates are persisted." />
        {!data.notifications.length && <EmptyState title="No notifications" />}
        <div className="grid gap-2">
          {data.notifications.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-white/5 p-3 sm:flex-row sm:items-center"><div><strong className="text-white">{item.type}</strong><p className="text-sm text-slate-400">{item.message}</p></div><Button onClick={async () => { await api.patch(`/api/admin/notifications/${item.id}/read`); await refresh(); }}><Check className="h-4 w-4" /> Mark read</Button></div>)}
        </div>
      </Card>
    </>
  );
}
