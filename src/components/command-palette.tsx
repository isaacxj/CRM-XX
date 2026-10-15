"use client";

import {
  Building2,
  Handshake,
  Keyboard,
  Monitor,
  Moon,
  Plus,
  Sun,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { searchPalette, type PaletteHit } from "@/app/palette-actions";
import { NAV_GROUPS } from "@/components/nav";
import { cn } from "@/lib/cn";
import { applyTheme } from "@/lib/theme";
import { SHORTCUTS } from "@/lib/shortcuts";

const OPEN_EVENT = "crm-open-palette";

export function openPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  Icon: LucideIcon;
  run: (router: ReturnType<typeof useRouter>, pathname: string) => void;
};

function businessTarget(pathname: string, business: string) {
  if (pathname.startsWith("/deals")) return `/deals?business=${business}`;
  if (pathname.startsWith("/revenue")) return `/revenue?business=${business}`;
  return business === "all" ? "/companies" : `/companies?business=${business}`;
}

// Current page with one query param set, so a sheet opens over what you are on.
function withParam(key: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

const COMMANDS: Command[] = [
  ...NAV_GROUPS.flatMap((group) =>
    group.items.map<Command>((item) => ({
      id: `go-${item.href}`,
      group: "Go to",
      label: item.label,
      Icon: item.Icon,
      run: (router) => router.push(item.href),
    })),
  ),
  {
    id: "new-company",
    group: "Actions",
    label: "Add company",
    Icon: Building2,
    run: (router) => router.push("/companies?new=1"),
  },
  {
    id: "log-activity",
    group: "Actions",
    label: "Log activity",
    hint: "Email, call, meeting, or note",
    Icon: Plus,
    run: (router) => router.push(withParam("quick", "activity")),
  },
  {
    id: "add-follow-up",
    group: "Actions",
    label: "Add follow-up",
    Icon: UserPlus,
    run: (router) => router.push(withParam("quick", "followup")),
  },
  {
    id: "import",
    group: "Actions",
    label: "Import companies from CSV",
    Icon: Users,
    run: (router) => router.push("/companies/import"),
  },
  ...(["all", "statixx", "trazo"] as const).map<Command>((business) => ({
    id: `business-${business}`,
    group: "Switch business",
    label:
      business === "all"
        ? "All businesses"
        : business === "statixx"
          ? "Statixx"
          : "Trazo",
    Icon: Handshake,
    run: (router, pathname) => router.push(businessTarget(pathname, business)),
  })),
  ...(
    [
      ["light", "Light theme", Sun],
      ["dark", "Dark theme", Moon],
      ["system", "Match system theme", Monitor],
    ] as const
  ).map<Command>(([theme, label, Icon]) => ({
    id: `theme-${theme}`,
    group: "Theme",
    label,
    Icon,
    run: () => applyTheme(theme),
  })),
  {
    id: "shortcuts",
    group: "Help",
    label: "Keyboard shortcuts",
    hint: "?",
    Icon: Keyboard,
    run: () => window.dispatchEvent(new Event("crm-open-shortcuts")),
  },
];

const KIND_ICON = {
  company: Building2,
  contact: Users,
  deal: Handshake,
} satisfies Record<PaletteHit["kind"], LucideIcon>;

type Row = {
  key: string;
  group: string;
  label: string;
  detail?: string;
  Icon: LucideIcon;
  run: () => void;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close keyboard shortcuts"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="bg-surface-raised border-border shadow-overlay relative w-full max-w-md rounded-t-xl border p-4 md:rounded-xl"
      >
        <h2 className="mb-3 text-base font-semibold">Keyboard shortcuts</h2>
        <dl className="flex flex-col gap-2 text-sm">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between gap-4"
            >
              <dt className="text-muted-foreground">{shortcut.label}</dt>
              <dd>
                <kbd className="num border-border rounded border px-1.5 py-0.5 text-xs">
                  {shortcut.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="bg-accent text-accent-foreground mt-4 h-11 w-full rounded-md text-sm font-medium md:h-9"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PaletteHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Records come from the server; stale responses are dropped.
  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    let current = true;
    const timer = setTimeout(() => {
      searchPalette(term)
        .then((found) => current && setHits(found))
        .catch(() => current && setHits([]));
    }, 150);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  const term = query.trim().toLowerCase();
  const recordRows: Row[] = term
    ? hits.map((hit) => ({
        key: hit.key,
        group: "Records",
        label: hit.label,
        detail: hit.detail,
        Icon: KIND_ICON[hit.kind],
        run: () => router.push(hit.href),
      }))
    : [];
  const commandRows: Row[] = COMMANDS.filter(
    (command) =>
      !term || `${command.group} ${command.label}`.toLowerCase().includes(term),
  ).map((command) => ({
    key: command.id,
    group: command.group,
    label: command.label,
    detail: command.hint,
    Icon: command.Icon,
    run: () => command.run(router, pathname),
  }));
  const rows = [...recordRows, ...commandRows];
  const active = Math.min(cursor, Math.max(rows.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, rows.length]);

  function choose(row: Row | undefined) {
    if (!row) return;
    onClose();
    row.run();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor(rows.length ? (active + 1) % rows.length : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor(rows.length ? (active - 1 + rows.length) % rows.length : 0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(rows[active]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 md:pt-[15vh]">
      <button
        type="button"
        aria-label="Close command palette"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="bg-surface-raised border-border shadow-overlay relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border"
      >
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={rows[active] && `palette-${rows[active].key}`}
          aria-label="Search or run a command"
          placeholder="Search records or type a command…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
            if (!event.target.value.trim()) setHits([]);
          }}
          className="border-border bg-surface-raised h-12 shrink-0 border-b px-4 text-base outline-none"
        />
        <ul
          id="palette-list"
          role="listbox"
          ref={listRef}
          className="overflow-y-auto p-1"
        >
          {rows.length === 0 && (
            <li className="text-muted-foreground px-3 py-6 text-center text-sm">
              Nothing matches “{query.trim()}”. Try a company, contact, or deal
              name, or a command like “add company”.
            </li>
          )}
          {rows.map((row, index) => (
            <li
              key={row.key}
              id={`palette-${row.key}`}
              role="option"
              aria-selected={index === active}
              onMouseMove={() => setCursor(index)}
              onClick={() => choose(row)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm md:min-h-9",
                index === active && "bg-accent-soft",
              )}
            >
              <row.Icon
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
              <span className="truncate font-medium">{row.label}</span>
              {row.detail && (
                <span className="text-muted-foreground truncate text-xs">
                  {row.detail}
                </span>
              )}
              <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                {index === 0 || rows[index - 1].group !== row.group
                  ? row.group
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const closeShortcuts = useCallback(() => setShortcuts(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShortcuts(false);
        setOpen((value) => !value);
      } else if (
        event.key === "?" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        setOpen(false);
        setShortcuts(true);
      }
    }
    const onOpen = () => setOpen(true);
    const onShortcuts = () => setShortcuts(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("crm-open-shortcuts", onShortcuts);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("crm-open-shortcuts", onShortcuts);
    };
  }, []);

  return (
    <>
      {open && <Palette onClose={close} />}
      {shortcuts && <ShortcutsSheet onClose={closeShortcuts} />}
    </>
  );
}
