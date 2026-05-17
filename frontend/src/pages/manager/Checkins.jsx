import React, { useState } from "react";
import { MessageSquare, Mic } from "lucide-react";
import { PageHeader } from "../../components/common/AppLayout";
import { Button } from "../../components/common/Button";
import { Card, CardHeader } from "../../components/common/Card";
import { Textarea } from "../../components/common/Form";
import { ErrorState, LoadingState } from "../../components/common/State";
import { GoalTable } from "../../components/tables/GoalTable";
import { VoiceInput } from "../../components/common/VoiceInput";
import { useDashboard } from "../../hooks/useDashboard";

export default function Checkins() {
  const { data, loading, error, refresh } = useDashboard();
  const [voice, setVoice] = useState("Completed customer onboarding for 15 clients");
  const [parsed, setParsed] = useState(null);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  return (
    <>
      <PageHeader title="Check-in Dashboard" subtitle="Quarterly planned vs actual updates, structured comments, voice input, and AI discussion logs." />
      <div className="grid gap-4 xl:grid-cols-[1fr_.7fr]">
        <Card>
          <CardHeader icon={MessageSquare} title="Planned vs Actual" hint="Q1-Q4 progress computation follows the BRD formula." />
          <GoalTable goals={data.visible_goals} refresh={refresh} currentUser={data.current_user} cycleState={data.cycle_state} mode="tracking" />
        </Card>
        <Card>
          <CardHeader icon={Mic} title="Voice Achievement Input" hint="SpeechRecognition with permission request, live transcript, parsing, and form-ready output." />
          <Textarea value={voice} onChange={(e) => setVoice(e.target.value)} />
          <div className="mt-3">
            <VoiceInput label="Quarter update dictation" context="quarter" onTranscript={setVoice} onParsed={setParsed} />
          </div>
          <Button className="mt-3" variant="primary" onClick={() => setParsed({ achievement: Number((voice.match(/\d+/) || [0])[0]), status: voice.toLowerCase().includes("completed") ? "Completed" : "On Track", confidence: 0.86 })}><Mic className="h-4 w-4" /> Parse Typed Update</Button>
          {parsed && <div className="mt-4 rounded-xl border border-line bg-white/5 p-4 text-sm text-slate-300"><b className="block text-cyan">Parsed achievement: {parsed.achievement}</b>Status: {parsed.status}<br />Confidence: {Math.round(parsed.confidence * 100)}%</div>}
        </Card>
      </div>
    </>
  );
}
