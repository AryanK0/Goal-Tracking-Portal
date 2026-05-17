import React, { createContext, useContext, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const value = useMemo(() => ({
    toast(message) {
      const id = crypto.randomUUID();
      setToasts((items) => [{ id, message }, ...items].slice(0, 3));
      setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
    }
  }), []);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="glass flex min-w-72 items-center gap-2 rounded-xl p-3 text-sm text-white">
            <CheckCircle2 className="h-4 w-4 text-mint" />
            {toast.message}
            <button onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
