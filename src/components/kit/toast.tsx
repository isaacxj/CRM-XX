"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

type Toast = { id: number; message: string; tone: "success" | "danger" };
type ToastApi = (message: string, tone?: Toast["tone"]) => void;

const ToastContext = createContext<ToastApi>(() => {});
let nextId = 1;

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  );
  const toast = useCallback<ToastApi>(
    (message, tone = "success") => {
      const id = nextId++;
      setToasts((all) => [...all, { id, message, tone }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed right-4 bottom-20 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "bg-surface-raised shadow-overlay flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
              t.tone === "danger" ? "border-danger/40" : "border-border-strong",
            )}
          >
            <p className="flex-1">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground -m-1 p-1"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Shows a message once when a server-rendered page loads (e.g. after import).
export function ToastOnMount({ message }: { message: string }) {
  const toast = useToast();
  useEffect(() => {
    toast(message);
  }, [message, toast]);
  return null;
}
