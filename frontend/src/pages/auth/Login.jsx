import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Bot, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Button } from "../../components/common/Button";
import { Field, Input } from "../../components/common/Form";

const roleMeta = {
  Employee: { icon: TrendingUp, color: "text-cyan", metric: "85% goal health" },
  Manager: { icon: Users, color: "text-violet", metric: "14 approvals" },
  Admin: { icon: ShieldCheck, color: "text-mint", metric: "6 audit alerts" }
};

export default function Login() {
  const { login, error, user } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState([]);
  const [form, setForm] = useState({ email: "admin@momentum.ai", password: "Momentum@123" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState("");

  useEffect(() => {
    api.get("/api/auth/demo-credentials").then(({ data }) => {
      if (Array.isArray(data)) setCredentials(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) navigate(defaultRoute(user.role));
  }, [user, navigate]);

  const primaryCredentials = useMemo(() => {
    const byRole = {};
    for (const item of credentials) if (!byRole[item.role]) byRole[item.role] = item;
    return ["Employee", "Manager", "Admin"].map((role) => byRole[role]).filter(Boolean);
  }, [credentials]);

  const signIn = async (email = form.email, password = form.password, label = "form") => {
    setLoading(label);
    try {
      const signedIn = await login(email, password);
      if (remember) localStorage.setItem("momentum_last_email", email);
      navigate(defaultRoute(signedIn.role));
    } finally {
      setLoading("");
    }
  };

  const submit = (event) => {
    event.preventDefault();
    signIn();
  };

  return (
    <div className="login-mesh relative z-10 grid min-h-screen overflow-hidden p-4 lg:grid-cols-[1.08fr_.92fr]">
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 22 }).map((_, index) => <span key={index} className="particle" style={{ left: `${(index * 43) % 100}%`, animationDelay: `${index * 0.18}s` }} />)}
      </div>
      <motion.section initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} className="relative hidden min-h-[calc(100vh-2rem)] flex-col justify-center p-8 lg:flex">
        <span className="text-xs font-black uppercase tracking-[0.24em] text-cyan">Intelligent Goal Alignment</span>
        <h1 className="mt-4 max-w-2xl text-6xl font-black leading-none text-white">Momentum AI</h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">Enterprise performance governance with SMART goals, quarterly evidence, approval controls, risk prediction, and HR Copilot.</p>
        <DashboardPreview />
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative grid place-items-center">
        <div className="glass w-full max-w-md rounded-3xl p-6 shadow-[0_24px_80px_rgba(0,0,0,.45)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-cyan">Secure workspace</span>
              <h2 className="mt-1 text-2xl font-black text-white">Sign in</h2>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan"><LockKeyhole className="h-5 w-5" /></div>
          </div>
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Password">
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-11" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-2.5 text-slate-400 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
            {error && <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-red-100">{error}</div>}
            <Button variant="primary" disabled={Boolean(loading)}>{loading === "form" ? "Signing in..." : "Login"}</Button>
          </form>
          <div className="mt-6 grid gap-2">
            {primaryCredentials.map((item) => <RoleCard key={item.email} item={item} loading={loading} onClick={() => signIn(item.email, item.password, item.role)} />)}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="mt-10 grid max-w-2xl gap-4">
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between"><strong className="text-white">Live performance cockpit</strong><Bot className="h-5 w-5 text-cyan" /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <PreviewMetric label="Goal completion" value="78%" tone="text-cyan" />
          <PreviewMetric label="Risk level" value="Yellow" tone="text-warning" />
          <PreviewMetric label="SMART score" value="92" tone="text-mint" />
        </div>
        <div className="mt-5 flex h-28 items-end gap-2">
          {[42, 68, 54, 82, 72, 91, 78].map((height, index) => <motion.i key={index} initial={{ height: 12 }} animate={{ height }} transition={{ repeat: Infinity, repeatType: "mirror", duration: 1.4 + index * 0.08 }} className="w-full rounded-t-lg bg-gradient-to-t from-cyan to-mint" />)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FloatingCard icon={Sparkles} label="AI summary ready" />
        <FloatingCard icon={BarChart3} label="QoQ trend improved" />
      </div>
    </div>
  );
}

function PreviewMetric({ label, value, tone }) {
  return <div className="rounded-xl border border-line bg-white/5 p-4"><span className="text-xs text-slate-400">{label}</span><strong className={`mt-1 block text-2xl ${tone}`}>{value}</strong></div>;
}

function FloatingCard({ icon: Icon, label }) {
  return <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="rounded-2xl border border-line bg-white/10 p-4 text-sm text-white backdrop-blur"><Icon className="mb-2 h-5 w-5 text-cyan" />{label}</motion.div>;
}

function RoleCard({ item, loading, onClick }) {
  const meta = roleMeta[item.role];
  const Icon = meta.icon;
  return (
    <button onClick={onClick} disabled={Boolean(loading)} className="group rounded-2xl border border-line bg-white/5 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan/60 hover:bg-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Icon className={`h-5 w-5 ${meta.color}`} /><div><strong className="block text-white">{item.role}</strong><span className="text-xs text-slate-400">{item.email}</span></div></div>
        <span className={`text-xs font-semibold ${meta.color}`}>{loading === item.role ? "Signing in..." : meta.metric}</span>
      </div>
    </button>
  );
}

function defaultRoute(role) {
  if (role === "Admin") return "/admin";
  if (role === "Manager") return "/manager";
  return "/employee";
}
