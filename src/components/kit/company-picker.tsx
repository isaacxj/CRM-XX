"use client";

import { useMemo, useState } from "react";

import { TextInput } from "@/components/ui/field";

export type PickerCompany = { id: number; name: string; business: string };

// Searchable company combobox. Submits the chosen id in a hidden input.
export function CompanyPicker({
  companies,
  name = "companyId",
  ...inputProps
}: {
  companies: PickerCompany[];
  name?: string;
} & Omit<React.ComponentProps<"input">, "name" | "value" | "onChange">) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PickerCompany | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [companies, query]);

  function choose(company: PickerCompany) {
    setSelected(company);
    setQuery(company.name);
    setOpen(false);
  }

  const listId = `${inputProps.id ?? name}-list`;

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <TextInput
        {...inputProps}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search companies…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            choose(matches[active]);
          } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="bg-surface-raised border-border-strong shadow-overlay absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border py-1 text-sm"
        >
          {matches.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2">
              No company matches “{query}”.
            </li>
          ) : (
            matches.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
                className="aria-selected:bg-surface-hover flex cursor-pointer items-center justify-between px-3 py-2"
              >
                <span>{c.name}</span>
                <span className="text-muted-foreground text-xs capitalize">
                  {c.business}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
