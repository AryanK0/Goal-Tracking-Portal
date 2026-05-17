import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, Sparkles, Target } from "lucide-react";
import { api, messageFromError } from "../../services/api";
import { Button } from "../common/Button";
import { Card, CardHeader } from "../common/Card";
import { Field, Input, Select, Textarea } from "../common/Form";
import { ProgressRing } from "../dashboard/ProgressRing";
import { useToast } from "../common/Toast";
import { VoiceInput } from "../common/VoiceInput";

const schema = z.object({
  title: z.string().min(5, "Enter a clear goal title"),
  description: z.string().min(10, "Description is required"),
  thrust_area: z.string().min(2),
  uom_type: z.string().min(1),
  direction: z.string().min(1),
  target: z.coerce.number().min(0),
  target_label: z.string().min(1),
  weightage: z.coerce.number().min(10).max(100)
}).refine((value) => value.direction === "zero" ? value.target === 0 : value.target > 0, {
  message: "Target must be 0 only for zero-based goals; otherwise use a positive target.",
  path: ["target"]
});

export function GoalForm({ data, refresh }) {
  const toast = useToast();
  const [prompt, setPrompt] = useState("Improve customer satisfaction");
  const [smart, setSmart] = useState(null);
  const myGoals = data.visible_goals.filter((goal) => goal.owner.id === data.current_user.id);
  const total = myGoals.reduce((sum, goal) => sum + Number(goal.weightage), 0);
  const remaining = 100 - total;
  const goalSetting = data.cycle_state?.windows?.["Goal Setting"];
  const actionsLocked = data.current_user.role !== "Admin" && goalSetting && !goalSetting.active;
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: "", description: "", thrust_area: "Execution", uom_type: "Numeric", direction: "min", target: 100, target_label: "100 units", weightage: 10 } });

  const generate = async () => {
    try {
      const { data: suggestion } = await api.post("/api/ai/smart-goal", { prompt, department: data.current_user.department });
      setSmart(suggestion);
      form.reset(suggestion);
      toast.toast("SMART goal generated");
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };

  const submitGoal = form.handleSubmit(async (values) => {
    if (actionsLocked) {
      toast.toast(goalSetting.notice);
      return;
    }
    try {
      await api.post("/api/goals", values);
      toast.toast("Goal created");
      form.reset();
      await refresh();
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  });

  const submitSheet = async () => {
    if (actionsLocked) {
      toast.toast(goalSetting.notice);
      return;
    }
    try {
      await api.post("/api/goals/submit");
      toast.toast("Goal sheet submitted");
      await refresh();
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <Card>
        <CardHeader icon={Sparkles} title="AI SMART Goal Assistant" hint="Type rough intent. Momentum AI converts it into a validated SMART goal." />
        <div className="grid gap-3">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <VoiceInput label="AI prompt dictation" context="prompt" onTranscript={setPrompt} />
          <Button variant="primary" onClick={generate}><Sparkles className="h-4 w-4" /> Generate SMART Goal</Button>
          {smart && <div className="rounded-xl border border-line bg-white/5 p-4"><h3 className="font-bold text-white">{smart.title}</h3><p className="mt-1 text-sm text-slate-400">{smart.description}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(smart.breakdown).map(([key, value]) => <span key={key} className="rounded-lg border border-line p-2 text-sm text-slate-300"><b className="block text-cyan">{key}</b>{value}</span>)}</div><div className="mt-3 text-sm text-mint">SMART score: {smart.smart_score}/100</div></div>}
        </div>
      </Card>
      <Card>
        <CardHeader icon={Target} title="Weightage Validation" hint="Total must equal 100%, each goal at least 10%, maximum 8 goals." />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProgressRing value={total} label={`Goal Weightage ${total}/100`} />
          <div className="grid gap-2 text-sm">
            {actionsLocked && <WarningCard tone="red" title={goalSetting.notice} />}
            <WarningCard title={remaining === 0 ? "Weightage complete" : "Weightage remaining"} detail={`Weight: ${total}/100`} tone={remaining === 0 ? "green" : "amber"} />
            {myGoals.some((goal) => goal.weightage < 10) && <WarningCard title="Minimum goal weightage" detail="Every goal must be at least 10%." tone="amber" />}
            {myGoals.length >= 8 && <WarningCard title={myGoals.length > 8 ? "Goal count exceeded" : "Goal count limit reached"} detail={`${myGoals.length}/8 goals`} tone={myGoals.length > 8 ? "red" : "amber"} />}
            <Button variant="primary" disabled={actionsLocked || total !== 100 || myGoals.length > 8} onClick={submitSheet}>Submit Goal Sheet</Button>
          </div>
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader icon={Target} title="Create Goal" hint="Validated form with role-safe backend enforcement." />
        <form onSubmit={submitGoal} className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <VoiceInput
              label="Goal creation voice capture"
              context="goal"
              onTranscript={(text) => {
                form.setValue("title", text.slice(0, 160));
                form.setValue("description", text);
              }}
            />
          </div>
          <Field label="Goal title" error={form.formState.errors.title?.message}><Input {...form.register("title")} /></Field>
          <Field label="Thrust area"><Input {...form.register("thrust_area")} /></Field>
          <Field label="UoM"><Select {...form.register("uom_type")}><option>Numeric</option><option>Percentage</option><option>Timeline</option><option>Zero-based</option></Select></Field>
          <Field label="Progress formula"><Select {...form.register("direction")}><option value="min">Higher is better</option><option value="max">Lower is better</option><option value="timeline">Completion date vs deadline</option><option value="zero">Zero is success</option></Select></Field>
          <Field label="Target"><Input type="number" {...form.register("target")} /></Field>
          <Field label="Target label"><Input {...form.register("target_label")} /></Field>
          <Field label="Weightage" error={form.formState.errors.weightage?.message}><Input type="number" {...form.register("weightage")} /></Field>
          <Field label="Description" error={form.formState.errors.description?.message}><Textarea {...form.register("description")} /></Field>
          <div className="md:col-span-2"><Button variant="primary" disabled={actionsLocked || myGoals.length >= 8 || total >= 100} type="submit">Create Goal</Button></div>
        </form>
      </Card>
    </div>
  );
}

function WarningCard({ title, detail, tone = "amber" }) {
  const color = tone === "green" ? "border-mint/40 bg-mint/10 text-mint" : tone === "red" ? "border-danger/40 bg-danger/10 text-danger" : "border-warning/40 bg-warning/10 text-warning";
  return <div className={`flex items-start gap-2 rounded-lg border p-3 ${color}`}><AlertTriangle className="mt-0.5 h-4 w-4" /><span><b className="block">{title}</b>{detail && <small className="text-slate-300">{detail}</small>}</span></div>;
}
