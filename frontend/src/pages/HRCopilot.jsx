import React, { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { api, messageFromError } from "../services/api";
import { PageHeader } from "../components/common/AppLayout";
import { Button } from "../components/common/Button";
import { Card, CardHeader } from "../components/common/Card";
import { Input } from "../components/common/Form";
import { useToast } from "../components/common/Toast";
import { VoiceInput } from "../components/common/VoiceInput";

export default function HRCopilot() {
  const [query, setQuery] = useState("Which department has highest delay risk?");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Ask me about declining performance, delay risk, distribution, or likely misses." }]);
  const toast = useToast();
  const ask = async () => {
    try {
      const { data } = await api.post("/api/ai/copilot", { query });
      setMessages((items) => [...items, { role: "user", text: query }, { role: "assistant", text: data.answer }]);
      setQuery("");
    } catch (err) {
      toast.toast(messageFromError(err));
    }
  };
  return (
    <>
      <PageHeader title="HR Copilot" subtitle="Natural-language assistant over live goals, departments, risk, and completion data." />
      <Card>
        <CardHeader icon={Bot} title="Ask Momentum AI" hint="Examples: Which department has highest delay risk? Show employees likely to miss targets." />
        <div className="mb-4 grid max-h-[52vh] gap-3 overflow-auto rounded-xl border border-line bg-black/20 p-4">
          {messages.map((item, index) => <div key={index} className={`max-w-3xl rounded-xl p-3 ${item.role === "assistant" ? "border border-cyan/30 bg-cyan/10 text-cyan" : "ml-auto border border-violet/30 bg-violet/10 text-violet"}`}>{item.text}</div>)}
        </div>
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button variant="primary" onClick={ask}><Send className="h-4 w-4" /> Ask</Button>
        </div>
        <div className="mt-3">
          <VoiceInput label="Copilot prompt dictation" context="prompt" onTranscript={setQuery} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Show employees likely to miss targets", "Goal distribution by UoM", "Which department has highest delay risk?"].map((item) => <Button key={item} variant="ghost" onClick={() => setQuery(item)}><Sparkles className="h-4 w-4" />{item}</Button>)}
        </div>
      </Card>
    </>
  );
}
