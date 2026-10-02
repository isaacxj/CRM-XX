"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";

// Wrap a server-action <form>: the trigger opens a dialog, and confirming
// submits the form. Uses the native <dialog> for focus trapping and Escape.
export function ConfirmSubmit({
  action,
  trigger,
  title,
  description,
  confirmLabel,
  danger = true,
}: {
  action: () => void | Promise<void>;
  trigger: string;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={action}>
      <Button
        type="button"
        variant="secondary"
        className={danger ? "text-danger" : undefined}
        onClick={() => dialog.current?.showModal()}
      >
        {trigger}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="confirm-title"
        className="bg-surface-raised text-foreground shadow-overlay border-border-strong m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border p-5 backdrop:bg-black/40"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" variant={danger ? "danger" : "primary"}>
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </form>
  );
}
