"use client";

import { useState } from "react";
import { Mail, MessageSquare, Phone, StickyNote, Users } from "lucide-react";

import { useToast } from "@/components/kit/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Kind = "note" | "email_sent" | "email_received" | "call" | "meeting";

const TABS: { kind: Kind; label: string; icon: typeof Mail }[] = [
  { kind: "note", label: "Note", icon: StickyNote },
  { kind: "email_sent", label: "Email sent", icon: Mail },
  { kind: "email_received", label: "Email received", icon: MessageSquare },
  { kind: "call", label: "Call", icon: Phone },
  { kind: "meeting", label: "Meeting", icon: Users },
];

const field =
  "border-border-strong bg-surface-raised text-foreground h-9 w-full rounded-md border px-3 text-sm";

export function Composer({
  action,
  contacts,
}: {
  action: (formData: FormData) => Promise<void>;
  contacts: { id: number; name: string }[];
}) {
  const [kind, setKind] = useState<Kind>("note");
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function submit(formData: FormData) {
    setPending(true);
    try {
      await action(formData);
      toast(`${TABS.find((t) => t.kind === kind)?.label} logged`);
      (document.getElementById("composer-form") as HTMLFormElement)?.reset();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Couldn't log that. Try again.",
        "danger",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      id="composer-form"
      action={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
      className="border-border bg-surface-raised flex flex-col gap-3 rounded-lg border p-3"
    >
      <input type="hidden" name="type" value={kind} />
      <div
        role="tablist"
        aria-label="Activity type"
        className="flex flex-wrap gap-1"
      >
        {TABS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm",
              kind === k
                ? "bg-accent-soft text-accent font-medium"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {kind !== "note" && (
        <Input name="subject" aria-label="Subject" placeholder="Subject" />
      )}
      <textarea
        name="body"
        rows={3}
        aria-label="Details"
        placeholder={
          kind === "note" ? "Write a note…" : "What happened? (optional)"
        }
        className="border-border-strong bg-surface-raised text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Contact</span>
          <select name="contactId" className={field}>
            <option value="">No contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {kind === "meeting" ? "Starts" : "When (defaults to now)"}
          </span>
          <input type="datetime-local" name="occurredAt" className={field} />
        </label>
        {kind === "meeting" && (
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Ends (optional)</span>
            <input type="datetime-local" name="endsAt" className={field} />
          </label>
        )}
        {kind === "email_sent" && (
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">
              Remind me in (days, 0 for none)
            </span>
            <input
              type="number"
              name="remindInDays"
              min="0"
              max="60"
              defaultValue={3}
              className={field}
            />
          </label>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground hidden text-xs sm:inline">
          ⌘Enter to save
        </span>
        <Button type="submit" disabled={pending} className="ml-auto">
          {pending ? "Logging…" : "Log activity"}
        </Button>
      </div>
    </form>
  );
}
