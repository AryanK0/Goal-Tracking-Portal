import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/common/Toast";
import { AppLayout } from "./components/common/AppLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { DashboardRedirect } from "./routes/DashboardRedirect";
import Login from "./pages/auth/Login";
import EmployeeDashboard from "./pages/employee/Dashboard";
import GoalsPage from "./pages/employee/Goals";
import ManagerDashboard from "./pages/manager/Dashboard";
import Checkins from "./pages/manager/Checkins";
import AdminDashboard from "./pages/admin/Dashboard";
import Analytics from "./pages/Analytics";
import HRCopilot from "./pages/HRCopilot";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

function ProtectedLayout({ roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppLayout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<DashboardRedirect />} />
            <Route element={<ProtectedLayout roles={["Employee", "Manager", "Admin"]} />}>
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/checkins" element={<Checkins />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route element={<ProtectedLayout roles={["Manager", "Admin"]} />}>
              <Route path="/manager" element={<ManagerDashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/copilot" element={<HRCopilot />} />
            </Route>
            <Route element={<ProtectedLayout roles={["Admin"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<DashboardRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
