import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, messageFromError } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("momentum_token")));
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("momentum_token");
    if (!token) return;
    api.get("/api/auth/me")
      .then(({ data }) => {
        if (data && typeof data === "object" && data.role) {
          setUser(data);
        } else {
          throw new Error("Invalid user response");
        }
      })
      .catch(() => {
        localStorage.removeItem("momentum_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    async login(email, password) {
      setError("");
      try {
        const { data } = await api.post("/api/auth/login", { email, password });
        if (data && data.token && data.user && data.user.role) {
          localStorage.setItem("momentum_token", data.token);
          setUser(data.user);
          return data.user;
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (err) {
        const message = messageFromError(err);
        setError(message);
        throw new Error(message);
      }
    },
    logout() {
      localStorage.removeItem("momentum_token");
      setUser(null);
    }
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
