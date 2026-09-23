"use client";

import React from "react";
import { useToast } from "@/lib/toast-context";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let borderClass = "border-zinc-200 dark:border-zinc-800";
        let icon = <Info className="h-4 w-4 text-sky-500 flex-shrink-0" />;

        if (toast.type === "success") {
          borderClass = "border-emerald-500/40";
          icon = <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
        } else if (toast.type === "error") {
          borderClass = "border-red-500/40";
          icon = <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${borderClass}`}
          >
            {icon}
            <div className="flex-1 text-xs">
              {toast.title && <div className="font-semibold mb-0.5">{toast.title}</div>}
              <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
