"use client";

import { createContext, useContext, useId } from "react";

import { cn } from "@/lib/cn";

// Field errors from the surrounding FormSheet, keyed by input name.
export const FormErrorsContext = createContext<Record<string, string>>({});

const controlCls =
  "border-border-strong bg-surface-raised text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 text-sm aria-[invalid=true]:border-danger";

export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return <select className={cn(controlCls, "h-9", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlCls, "py-2", className)} {...props} />;
}

export function TextInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input className={cn(controlCls, "h-9", className)} {...props} />;
}

// Label + control + inline error. The control is passed as a render function
// so it gets the generated id and aria attributes.
export function Field({
  label,
  name,
  hint,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  children: (props: {
    id: string;
    name: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const id = useId();
  const error = useContext(FormErrorsContext)[name];
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        name,
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={`${id}-error`} className="text-danger text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
