"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

type ToastAction = { label: string; onClick: () => void | Promise<void> };
type Toast = {
  id: number;
  message: string;
  tone: "success" | "danger";
  action?: ToastAction;
};
type ToastApi = (
  message: string,
  tone?: Toast["tone"],
  action?: ToastAction,
) => void;

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
    (message, tone = "success", action) => {
      const id = nextId++;
      setToasts((all) => [...all, { id, message, tone, action }]);
      // Toasts with an action (undo) stay long enough to reach it.
      setTimeout(() => dismiss(id), action ? 10000 : 5000);
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
            {t.action && (
              <button
                type="button"
                onClick={async () => {
                  dismiss(t.id);
                  await t.action?.onClick();
                }}
                className="text-accent -my-1 rounded px-1.5 py-1 font-medium hover:underline"
              >
                {t.action.label}
              </button>
            )}
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

// Like ToastOnMount, with an Undo button that runs a server action.
export function UndoToastOnMount({
  message,
  undo,
  undoneMessage,
}: {
  message: string;
  undo: () => Promise<void>;
  undoneMessage: string;
}) {
  const toast = useToast();
  useEffect(() => {
    toast(message, "success", {
      label: "Undo",
      onClick: async () => {
        await undo();
        toast(undoneMessage);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);
  return null;
}

// Shows the `?problem=` message left by a server action that rejected its
// input, then removes it from the address so a reload doesn't repeat it.
export function FlashProblem() {
  const toast = useToast();
  const message = useSearchParams().get("problem");
  useEffect(() => {
    if (!message) return;
    toast(message, "danger");
    const url = new URL(window.location.href);
    url.searchParams.delete("problem");
    window.history.replaceState(null, "", url);
  }, [message, toast]);
  return null;
}
