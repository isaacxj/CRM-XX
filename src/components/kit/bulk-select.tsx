"use client";

import { useEffect, useState } from "react";

const SELECTOR = 'input[name="ids"]';

function boxes() {
  return Array.from(document.querySelectorAll<HTMLInputElement>(SELECTOR));
}

// Header checkbox: selects or clears every row checkbox on the page.
export function SelectAll({ label }: { label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="size-4 cursor-pointer"
      onChange={(e) => {
        for (const box of boxes()) box.checked = e.currentTarget.checked;
        document.dispatchEvent(new Event("change"));
      }}
    />
  );
}

// Shown above the table; the actions appear once something is selected.
// Row checkboxes are plain inputs named "ids" tied to the form by id.
export function BulkBar({
  noun,
  children,
}: {
  noun: string;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(boxes().filter((b) => b.checked).length);
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, []);

  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="bg-surface-raised border-border-strong flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm"
    >
      <span className="font-medium" aria-live="polite">
        {count} {noun} selected
      </span>
      {children}
    </div>
  );
}
