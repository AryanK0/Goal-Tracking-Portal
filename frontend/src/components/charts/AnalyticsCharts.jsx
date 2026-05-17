import React from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "../common/Card";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon } from "lucide-react";

const colors = ["#58fff1", "#9b7cff", "#38f2a6", "#ffbf47", "#ff5f76", "#7dd3fc"];

export function AnalyticsCharts({ data }) {
  const dept = data.departments || [];
  const distribution = Object.entries(data.goals.reduce((acc, goal) => {
    acc[goal.uom_type] = (acc[goal.uom_type] || 0) + 1;
    return acc;
  }, {})).map(([name, value]) => ({ name, value }));
  const trend = ["Q1", "Q2", "Q3", "Q4"].map((q) => ({
    quarter: q,
    progress: Math.round(data.goals.reduce((sum, goal) => sum + (goal.updates.find((u) => u.quarter === q)?.progress || 0), 0) / Math.max(data.goals.length, 1))
  }));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader icon={BarChart3} title="Department Heatmap" hint="Completion and risk by department" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dept}>
              <CartesianGrid stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="department" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: "#07111c", border: "1px solid rgba(117,255,246,.22)", borderRadius: 12 }} />
              <Bar dataKey="completion" fill="#58fff1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="risk" fill="#ffbf47" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <CardHeader icon={LineIcon} title="Quarter Trend" hint="QoQ progress movement" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="quarter" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#07111c", border: "1px solid rgba(117,255,246,.22)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="progress" stroke="#38f2a6" strokeWidth={3} dot={{ fill: "#38f2a6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <CardHeader icon={PieIcon} title="Goal Distribution" hint="Breakdown by UoM type" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88}>
                {distribution.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#07111c", border: "1px solid rgba(117,255,246,.22)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
