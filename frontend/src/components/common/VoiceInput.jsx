import React, { useMemo, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { api, messageFromError } from "../../services/api";
import { Button } from "./Button";

const statusCopy = {
  idle: "Idle",
  listening: "Listening",
  processing: "Processing",
  success: "Captured",
  error: "Error"
};

export function VoiceInput({ label, context = "goal", onTranscript, onParsed, className = "" }) {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const supported = useMemo(() => typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), []);

  const processTranscript = async (text) => {
    setStatus("processing");
    setTranscript(text);
    onTranscript?.(text);
    try {
      if (context === "quarter") {
        const { data } = await api.post("/api/ai/voice-achievement", { query: text });
        onParsed?.(data);
      }
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (err) {
      setError(messageFromError(err));
      setStatus("error");
    }
  };

  const start = async () => {
    setError("");
    if (!supported) {
      setStatus("error");
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      let finalText = "";
      let hadError = false;
      recognition.onstart = () => setStatus("listening");
      recognition.onresult = (event) => {
        const text = Array.from(event.results).map((result) => result[0].transcript).join(" ");
        finalText = text.trim();
        setTranscript(finalText);
      };
      recognition.onerror = (event) => {
        hadError = true;
        setStatus("error");
        setError(event.error === "not-allowed" ? "Microphone permission was denied." : "Speech recognition stopped before audio was captured.");
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        if (finalText) processTranscript(finalText);
        else if (!hadError) setStatus("idle");
      };
      recognition.start();
    } catch {
      setStatus("error");
      setError("Microphone unavailable or permission was denied.");
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setStatus("processing");
  };

  return (
    <div className={`rounded-xl border border-line bg-white/5 p-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase text-slate-400">{label || "Voice input"}</span>
          <p className={status === "error" ? "text-sm font-semibold text-danger" : "text-sm font-semibold text-cyan"}>{statusCopy[status]}</p>
        </div>
        {status === "listening" ? (
          <Button variant="danger" type="button" onClick={stop}><Square className="h-4 w-4" /> Stop</Button>
        ) : (
          <Button type="button" onClick={start}><Mic className="h-4 w-4" /> Speak</Button>
        )}
      </div>
      {transcript && <p className="mt-2 break-words text-sm text-slate-300">{transcript}</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {!supported && <p className="mt-2 text-xs text-warning">Use Chrome or Edge for browser SpeechRecognition.</p>}
    </div>
  );
}
