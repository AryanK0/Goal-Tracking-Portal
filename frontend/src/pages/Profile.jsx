import React from "react";
import { Award, User } from "lucide-react";
import { PageHeader } from "../components/common/AppLayout";
import { Card, CardHeader } from "../components/common/Card";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Profile" subtitle="Role, hierarchy, badges, streaks, and demo identity." />
      <Card>
        <CardHeader icon={User} title={user.name} hint={`${user.role} • ${user.department}`} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Email" value={user.email} />
          <Info label="Manager" value={user.manager_id || "Executive / HR"} />
          <Info label="Workload" value={`${user.workload}%`} />
          <Info label="Consistency streak" value={`${user.streak} quarters`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{user.badges.map((badge) => <span key={badge} className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-3 py-1 text-sm text-mint"><Award className="h-4 w-4" />{badge}</span>)}</div>
      </Card>
    </>
  );
}

function Info({ label, value }) {
  return <div className="rounded-xl border border-line bg-white/5 p-4"><span className="text-xs text-slate-400">{label}</span><strong className="block text-white">{value}</strong></div>;
}
