"use client";

import { useState } from "react";

import { TextInput } from "@/components/ui/field";

function isoOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
];

// Date input with one-tap presets. Submits as a plain yyyy-mm-dd field.
export function DateField(props: React.ComponentProps<"input">) {
  const [value, setValue] = useState(String(props.defaultValue ?? ""));
  const { defaultValue: _ignored, ...rest } = props;
  void _ignored;

  return (
    <div className="flex flex-col gap-1.5">
      <TextInput
        {...rest}
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const iso = isoOffset(p.days);
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={value === iso}
              onClick={() => setValue(iso)}
              className="border-control hover:bg-surface-hover aria-pressed:bg-accent aria-pressed:text-accent-foreground rounded-md border px-2 py-1 text-xs"
            >
              {p.label}
            </button>
          );
        })}
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="text-muted-foreground hover:text-foreground px-1 py-1 text-xs"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
