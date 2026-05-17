import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Lock, MessageSquare, RotateCcw, Save, TrendingUp, X } from "lucide-react";
import { api, messageFromError } from "../../services/api";
import { Button } from "../common/Button";
import { Input, Select, Textarea } from "../common/Form";
import { EmptyState } from "../common/State";
import { useToast } from "../common/Toast";
import { VoiceInput } from "../common/VoiceInput";

export function GoalTable({ goals, refresh, mode = "view", currentUser, cycleState }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const [exceptionGoal, setExceptionGoal] = useState(null);
  const [exceptionAction, setExceptionAction] = useState("unlock");
  if (!goals.length) return <EmptyState title="No goals found" message="The selected workflow does not have matching goals yet." />;

  const run = async (message, fn) => {
    setBusy(message);
    try {
      const result = await fn();
      const affected = result?.data?.affected_linked_goals;
      toast.toast(affected && affected > 1 ? `This update affects ${affected} linked goals` : message);
      await refresh();
    } catch (err) {
      toast.toast(messageFromError(err));
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="grid gap-3">
        {goals.map((goal) => (
          <GoalRow
            key={goal.goal_id}
            goal={goal}
            mode={mode}
            currentUser={currentUser}
            cycleState={cycleState}
            run={run}
            busy={busy}
            onException={(item, action) => {
              setExceptionGoal(item);
              setExceptionAction(action);
            }}
          />
        ))}
      </div>
      {exceptionGoal && (
        <UnlockModal
          goal={exceptionGoal}
          action={exceptionAction}
          onClose={() => setExceptionGoal(null)}
          onConfirm={(reason) => run(exceptionAction === "unlock" ? "Goal unlocked" : "Goal re-locked", () => api.post(`/api/goals/${exceptionGoal.goal_id}/${exceptionAction === "unlock" ? "unlock" : "relock"}`, { reason })).then(() => setExceptionGoal(null))}
        />
      )}
    </>
  );
}

function GoalRow({ goal, mode, currentUser, cycleState, run, busy, onException }) {
  const defaultQuarter = "Q2";
  const initialUpdate = goal.updates.find((u) => u.quarter === defaultQuarter) || goal.updates[0];
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description);
  const [target, setTarget] = useState(goal.target);
  const [targetLabel, setTargetLabel] = useState(goal.target_label);
  const [weightage, setWeightage] = useState(goal.weightage);
  const [planned, setPlanned] = useState(initialUpdate?.planned || goal.target);
  const [achievement, setAchievement] = useState(initialUpdate?.achievement || 0);
  const [status, setStatus] = useState(initialUpdate?.status || goal.status);
  const [comment, setComment] = useState("");
  const canApprove = ["Manager", "Admin"].includes(currentUser.role);
  const isSharedRecipient = goal.shared_goal_id && !goal.primary_owner && currentUser.role === "Employee";
  const canEditGoal = (!goal.locked && !isSharedRecipient) || currentUser.role === "Admin" || (canApprove && !goal.locked);
  const canEditWeight = !goal.locked || currentUser.role === "Admin";
  const quarterWindow = cycleState?.windows?.[quarter];
  const trackingLocked = currentUser.role !== "Admin" && quarterWindow && !quarterWindow.active;

  const selectQuarter = (nextQuarter) => {
    const next = goal.updates.find((u) => u.quarter === nextQuarter);
    setQuarter(nextQuarter);
    setPlanned(next?.planned || goal.target);
    setAchievement(next?.achievement || 0);
    setStatus(next?.status || goal.status);
  };

  const save = async () => {
    const patch = { weightage: Number(weightage) };
    if (mode === "approval" && canEditGoal) Object.assign(patch, { title, description, target: Number(target), target_label: targetLabel });
    if (canEditWeight || (mode === "approval" && canEditGoal)) await api.patch(`/api/goals/${goal.goal_id}`, patch);
    if (!trackingLocked) {
      return api.post(`/api/goals/${goal.goal_id}/quarter-update`, { quarter, planned: Number(planned), achievement: Number(achievement), status });
    }
    return { data: { ok: true } };
  };

  return (
    <article className="grid gap-4 rounded-2xl border border-line bg-black/20 p-4 xl:grid-cols-[1.25fr_.8fr_.7fr_.75fr]">
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone={goal.health === "Red" ? "red" : goal.health === "Yellow" ? "amber" : "green"}>{goal.health} Risk</Badge>
          <Badge>{goal.visual_state || goal.approval_status}</Badge>
          {goal.locked && <Badge><Lock className="h-3 w-3" /> Locked</Badge>}
          {goal.shared_goal_id && <Badge><TrendingUp className="h-3 w-3" /> Shared KPI</Badge>}
        </div>
        {mode === "approval" && canEditGoal ? (
          <div className="grid gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-white">{goal.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{goal.description}</p>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
          <span>{goal.owner.name}</span><span>-</span><span>{goal.thrust_area}</span><span>-</span><span>{goal.uom_type}</span><span>-</span><span>{goal.target_label}</span>
        </div>
        {goal.shared_impact_count > 1 && <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-warning">This update affects {goal.shared_impact_count} linked goals</p>}
      </div>
      <div>
        <Meter label={`Progress ${goal.progress}%`} value={goal.progress} />
        <Meter label={`Completion probability ${goal.completion_probability}%`} value={goal.completion_probability} />
        <p className="mt-2 text-xs text-warning">{goal.causes.join(" - ")}</p>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {["Q1", "Q2", "Q3", "Q4"].map((item) => <button key={item} type="button" onClick={() => selectQuarter(item)} className={`rounded-lg border px-2 py-1 text-xs ${quarter === item ? "border-cyan bg-cyan text-slate-950" : "border-line bg-white/5 text-slate-300"}`}>{item}</button>)}
        </div>
        {trackingLocked && <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-warning">{quarterWindow.notice}</p>}
      </div>
      <div className="grid gap-2">
        {mode === "approval" && canEditGoal && <label className="text-xs text-slate-400">Target<Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></label>}
        {mode === "approval" && canEditGoal && <label className="text-xs text-slate-400">Target label<Input value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} /></label>}
        <label className="text-xs text-slate-400">Weightage<Input type="number" min="10" max="100" value={weightage} disabled={!canEditWeight} onChange={(e) => setWeightage(e.target.value)} /></label>
        <label className="text-xs text-slate-400">{quarter} Planned<Input type="number" value={planned} disabled={trackingLocked} onChange={(e) => setPlanned(e.target.value)} /></label>
        <label className="text-xs text-slate-400">{quarter} Achievement<Input type="number" value={achievement} disabled={trackingLocked} onChange={(e) => setAchievement(e.target.value)} /></label>
        <label className="text-xs text-slate-400">Status<Select value={status} disabled={trackingLocked} onChange={(e) => setStatus(e.target.value)}><option>Not Started</option><option>On Track</option><option>Completed</option></Select></label>
        <VoiceInput label={`${quarter} voice update`} context="quarter" onParsed={(parsed) => { setAchievement(parsed.achievement); setStatus(parsed.status); }} />
      </div>
      <div className="grid content-start gap-2">
        <Button disabled={busy || (trackingLocked && mode === "tracking")} onClick={() => run("Goal saved", save)}><Save className="h-4 w-4" /> Save</Button>
        <label className="focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
          <FileUp className="h-4 w-4" /> Evidence
          <input className="hidden" type="file" accept=".pdf,.csv,image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append("file", file);
            run("Evidence uploaded", () => api.post(`/api/goals/${goal.goal_id}/evidence`, form, { headers: { "Content-Type": "multipart/form-data" } }));
          }} />
        </label>
        {canApprove && mode === "approval" && <Button variant="primary" onClick={() => run("Goal approved", () => api.post(`/api/goals/${goal.goal_id}/approve`, { reason: "Approved from manager review" }))}><CheckCircle2 className="h-4 w-4" /> Approve</Button>}
        {canApprove && mode === "approval" && <Button variant="danger" onClick={() => run("Goal returned", () => api.post(`/api/goals/${goal.goal_id}/return`, { reason: "Please sharpen measurable evidence" }))}><AlertTriangle className="h-4 w-4" /> Return</Button>}
        {currentUser.role === "Admin" && goal.locked && <Button onClick={() => onException(goal, "unlock")}><RotateCcw className="h-4 w-4" /> Unlock</Button>}
        {currentUser.role === "Admin" && !goal.locked && goal.approval_status === "Unlocked" && <Button onClick={() => onException(goal, "relock")}><Lock className="h-4 w-4" /> Re-lock</Button>}
        {canApprove && <Textarea placeholder="Structured check-in comment" value={comment} onChange={(e) => setComment(e.target.value)} />}
        {canApprove && <Button disabled={!comment || busy} onClick={() => run("Comment added", () => api.post("/api/comments", { employee_id: goal.user_id, goal_id: goal.goal_id, text: comment }))}><MessageSquare className="h-4 w-4" /> Comment</Button>}
      </div>
    </article>
  );
}

function UnlockModal({ goal, action, onClose, onConfirm }) {
  const [reason, setReason] = useState(action === "unlock" ? "Manager-approved correction window for demo journey" : "Correction window closed after employee update");
  const title = action === "unlock" ? "Unlock goal" : "Re-lock goal";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" role="dialog" aria-modal="true">
      <div className="glass w-full max-w-lg rounded-2xl p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{goal.title}</p>
          </div>
          <button className="rounded-lg border border-line p-2 text-slate-300 hover:bg-white/10" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <label className="text-xs font-semibold uppercase text-slate-400">Reason</label>
        <Textarea className="mt-2" value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">This action is written to unlock history, notifications, and audit logs.</div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>{title}</Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, tone }) {
  const color = tone === "red" ? "border-danger/40 bg-danger/15 text-red-100" : tone === "amber" ? "border-warning/40 bg-warning/15 text-warning" : tone === "green" ? "border-mint/40 bg-mint/15 text-mint" : "border-line bg-white/5 text-slate-200";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${color}`}>{children}</span>;
}

function Meter({ label, value }) {
  return <div className="mt-2"><div className="mb-1 text-xs text-slate-300">{label}</div><div className="h-2 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full bg-gradient-to-r from-cyan to-mint" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}
