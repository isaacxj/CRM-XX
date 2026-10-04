"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormErrorsContext } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";

// Right-hand side sheet around a server-action form. The first field is
// focused on open, Escape closes, Cmd/Ctrl+Enter saves, and validation errors
// from the action show inline on each Field.
export function FormSheet({
  title,
  description,
  closeHref,
  action,
  submitLabel,
  children,
}: {
  title: string;
  description?: string;
  closeHref: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")
      ?.focus();
  }, []);

  useEffect(() => {
    if (state?.errors) {
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid=true]")
        ?.focus();
    }
  }, [state]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(closeHref);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={() => router.push(closeHref)}
        className="absolute inset-0 bg-black/30"
      />
      <form
        ref={formRef}
        noValidate
        // Not the form's action prop: React would reset the fields after a
        // failed submit and the person would lose what they typed.
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        className="bg-surface-raised border-border-strong shadow-overlay relative flex h-full w-full max-w-md flex-col border-l"
      >
        <header className="border-border flex items-start justify-between gap-3 border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="text-muted-foreground mt-0.5 text-sm">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => router.push(closeHref)}
            className="text-muted-foreground hover:text-foreground -m-1.5 rounded-md p-1.5"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>
        <FormErrorsContext.Provider value={state?.errors ?? {}}>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            {state?.message && (
              <p role="alert" className="text-danger text-sm">
                {state.message}
              </p>
            )}
            {children}
          </div>
        </FormErrorsContext.Provider>
        <footer className="border-border flex items-center justify-between gap-2 border-t p-4 pb-24 md:pb-4">
          <span className="text-muted-foreground hidden text-xs md:inline">
            ⌘Enter to save
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(closeHref)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </div>
        </footer>
      </form>
    </div>
  );
}
