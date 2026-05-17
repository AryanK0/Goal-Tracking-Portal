import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Bell, Bot, ClipboardCheck, FileText, Home, Lock, LogOut, Moon, Search, Settings, Shield, Sun, Target, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "./Button";
import { api } from "../../services/api";

const nav = [
  { to: "/employee", label: "Employee", icon: Home, roles: ["Employee", "Manager", "Admin"] },
  { to: "/goals", label: "Goal Creation", icon: Target, roles: ["Employee", "Manager", "Admin"] },
  { to: "/manager", label: "Manager", icon: ClipboardCheck, roles: ["Manager", "Admin"] },
  { to: "/checkins", label: "Check-ins", icon: Activity, roles: ["Employee", "Manager", "Admin"] },
  { to: "/analytics", label: "Analytics", icon: FileText, roles: ["Manager", "Admin"] },
  { to: "/copilot", label: "HR Copilot", icon: Bot, roles: ["Manager", "Admin"] },
  { to: "/reports", label: "Reports", icon: FileText, roles: ["Employee", "Manager", "Admin"] },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["Admin"] },
  { to: "/audit", label: "Audit Logs", icon: Lock, roles: ["Admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["Admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["Employee", "Manager", "Admin"] },
  { to: "/profile", label: "Profile", icon: User, roles: ["Employee", "Manager", "Admin"] }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [light, setLight] = useState(false);
  const roleTone = user.role === "Admin" ? "text-mint" : user.role === "Manager" ? "text-violet" : "text-cyan";
  const visibleNav = useMemo(() => nav.filter((item) => item.roles.includes(user.role)), [user.role]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = light ? "light" : "dark";
    document.body.classList.toggle("light-shell", light);
  }, [light]);

  useEffect(() => {
    api.get("/api/admin/notifications").then(({ data }) => setNotifications(data)).catch(() => setNotifications([]));
  }, []);

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <div className="relative z-10 grid min-h-screen gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="glass sticky top-4 h-fit rounded-2xl p-4 lg:h-[calc(100vh-2rem)]">
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
          <div className="grid h-12 w-12 place-items-center border border-cyan text-xl font-black text-cyan shadow-[0_0_28px_rgba(88,255,241,.26)]">M</div>
          <div>
            <strong className="block text-white">Momentum AI</strong>
            <span className="text-xs text-slate-400">Goal Intelligence OS</span>
          </div>
        </div>
        <div className="mb-4 rounded-xl border border-line bg-white/5 p-3">
          <span className="text-xs text-slate-400">Signed in</span>
          <strong className="block text-white">{user.name}</strong>
          <span className={`text-xs font-semibold ${roleTone}`}>{user.role} - {user.department}</span>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setPaletteOpen(true)}><Search className="h-4 w-4" /> Ctrl K</Button>
          <Button variant="ghost" onClick={() => setLight((value) => !value)}>{light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Theme</Button>
        </div>
        <button onClick={() => navigate("/notifications")} className="mb-3 flex w-full items-center justify-between rounded-xl border border-line bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10">
          <span className="inline-flex min-w-0 items-center gap-2"><Bell className="h-4 w-4 text-cyan" /> Notification center</span>
          <span className="rounded-full bg-cyan px-2 py-0.5 text-xs font-black text-slate-950">{unread}</span>
        </button>
        <nav className="grid gap-1">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-cyan text-slate-950 font-bold" : "text-slate-300 hover:bg-white/10"}`}>
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <Button className="mt-4 w-full" variant="ghost" onClick={() => { logout(); navigate("/login"); }}><LogOut className="h-4 w-4" /> Logout</Button>
      </aside>
      <main className="min-w-0">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.div>
      </main>
      {paletteOpen && <CommandPalette items={visibleNav} onClose={() => setPaletteOpen(false)} onSelect={(to) => { setPaletteOpen(false); navigate(to); }} />}
    </div>
  );
}

function CommandPalette({ items, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/60 p-4 pt-24 backdrop-blur" onClick={onClose}>
      <div className="glass mx-auto w-full max-w-xl rounded-2xl p-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-black/30 px-3 py-2">
          <Search className="h-4 w-4 text-cyan" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search routes and workflows" className="w-full bg-transparent text-sm text-white outline-none" />
        </div>
        <div className="mt-3 grid gap-1">
          {filtered.map(({ to, label, icon: Icon }) => <button key={to} onClick={() => onSelect(to)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"><Icon className="h-4 w-4 text-cyan" />{label}</button>)}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <header className="glass mb-4 overflow-hidden rounded-2xl p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="text-xs font-black uppercase text-cyan">Momentum AI</span>
          <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
        </div>
        {action}
      </div>
    </header>
  );
}
