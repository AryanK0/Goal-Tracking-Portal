import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "../components/common/State";

export function dashboardPath(role) {
  if (role === "Admin") return "/admin";
  if (role === "Manager") return "/manager";
  return "/employee";
}

export function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPath(user.role)} replace />;
}
