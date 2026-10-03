"use client";

import { useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import { useToast } from "@/components/kit/toast";
import { Input } from "@/components/ui/input";

type Option = { value: string; label: string };

// A value that turns into an input on click. Enter saves, Escape cancels.
// `action` is a server action that receives `field` and `value`.
export function InlineField({
  action,
  field,
  label,
  value,
  display,
  options,
  type = "text",
  placeholder,
}: {
  action: (formData: FormData) => Promise<void>;
  field: string;
  label: string;
  value: string;
  display?: React.ReactNode;
  options?: Option[];
  type?: "text" | "url";
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  async function save(formData: FormData) {
    setPending(true);
    try {
      await action(formData);
      toast(`${label} updated`);
      setEditing(false);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : `Couldn't save ${label.toLowerCase()}. Try again.`,
        "danger",
      );
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${label.toLowerCase()}`}
        className="group hover:bg-surface-hover -mx-2 flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm"
      >
        <span className="min-w-0 truncate">
          {display ??
            (value || (
              <span className="text-muted-foreground">
                {placeholder ?? "Add"}
              </span>
            ))}
        </span>
        <Pencil
          className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={save}
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="field" value={field} />
      {options ? (
        <select
          name="value"
          aria-label={label}
          defaultValue={value}
          autoFocus
          className="border-border-strong bg-surface-raised h-8 w-full rounded-md border px-2 text-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          name="value"
          type={type}
          aria-label={label}
          defaultValue={value}
          placeholder={placeholder}
          autoFocus
          className="h-8"
        />
      )}
      <button
        type="submit"
        disabled={pending}
        aria-label={`Save ${label.toLowerCase()}`}
        className="text-success hover:bg-surface-hover rounded-md p-1.5"
      >
        <Check className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => setEditing(false)}
        className="text-muted-foreground hover:bg-surface-hover rounded-md p-1.5"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
