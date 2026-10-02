"use client";

import {
  Building2,
  CheckSquare,
  ChevronDown,
  Handshake,
  Home,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { CommandPalette, openPalette } from "@/components/command-palette";
import { NAV_GROUPS, type NavItem } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";
import type { Business } from "@/server/db/schema";

const PHONE_TABS: NavItem[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/companies", label: "Companies", Icon: Building2 },
  { href: "/deals", label: "Deals", Icon: Handshake },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
];

const BUSINESS_OPTIONS: { value: Business | "all"; label: string }[] = [
  { value: "all", label: "All businesses" },
  { value: "statixx", label: "Statixx" },
  { value: "trazo", label: "Trazo" },
];

const SECTION_LABELS: Record<string, string> = {
  companies: "Companies",
  contacts: "Contacts",
  deals: "Deals",
  tasks: "Tasks",
  revenue: "Revenue",
  digest: "Morning digest",
  export: "Export",
  design: "Design",
  search: "Search",
  "quick-add": "Quick add",
  import: "Import",
  new: "New",
  edit: "Edit",
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function breadcrumbs(pathname: string) {
  const crumbs = [{ href: "/", label: "Home" }];
  let href = "";
  for (const segment of pathname.split("/").filter(Boolean)) {
    href += `/${segment}`;
    crumbs.push({ href, label: SECTION_LABELS[segment] ?? "Details" });
  }
  return crumbs;
}

function initialsOf(email: string | null) {
  if (!email) return "?";
  const parts = email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[1][0] : email.slice(0, 2);
  return letters.toUpperCase();
}

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

function useSearchShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(event.target)) return;

      const search = document.getElementById("q");
      if (search instanceof HTMLInputElement) {
        event.preventDefault();
        search.focus();
        search.select();
        return;
      }

      event.preventDefault();
      router.push("/search");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}

const COLLAPSE_KEY = "crm-sidebar-collapsed";
const COLLAPSE_EVENT = "crm-sidebar-change";

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(COLLAPSE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COLLAPSE_EVENT, onChange);
  };
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false,
  );
  function toggle() {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }
  return [collapsed, toggle] as const;
}

function businessHref(
  pathname: string,
  value: Business | "all",
  perBusinessOnly: boolean,
) {
  if (pathname.startsWith("/revenue")) return `/revenue?business=${value}`;
  if (perBusinessOnly) return `/deals?business=${value}`;
  return value === "all" ? "/companies" : `/companies?business=${value}`;
}

function BusinessDot({ business }: { business: string }) {
  return (
    <span
      data-business={business}
      aria-hidden
      className="bg-accent inline-block size-2 shrink-0 rounded-full"
    />
  );
}

function BusinessSwitcher({
  pathname,
  active,
  perBusinessOnly,
}: {
  pathname: string;
  active: string;
  perBusinessOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = perBusinessOnly
    ? BUSINESS_OPTIONS.filter((option) => option.value !== "all")
    : BUSINESS_OPTIONS;
  const current =
    BUSINESS_OPTIONS.find((option) => option.value === active) ??
    BUSINESS_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="border-border bg-surface hover:bg-surface-hover flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors"
      >
        <BusinessDot business={current.value} />
        <span>{current.label}</span>
        <ChevronDown className="text-muted-foreground size-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="border-border bg-surface-raised shadow-overlay absolute top-full left-0 z-30 mt-1 w-48 rounded-lg border p-1"
        >
          {options.map((option) => (
            <Link
              key={option.value}
              role="menuitem"
              href={businessHref(pathname, option.value, perBusinessOnly)}
              onClick={() => setOpen(false)}
              className={cn(
                "hover:bg-surface-hover flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                active === option.value && "bg-accent-soft font-medium",
              )}
            >
              <BusinessDot business={option.value} />
              {option.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors",
        collapsed && "justify-center",
        active
          ? "bg-accent-soft text-foreground"
          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      <item.Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const [collapsed, toggle] = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "border-border bg-surface sticky top-0 hidden h-screen shrink-0 flex-col gap-4 border-r p-2 transition-[width] md:flex",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <Link
        href="/quick-add"
        title={collapsed ? "Quick add" : undefined}
        aria-label={collapsed ? "Quick add" : undefined}
        className="bg-accent text-accent-foreground flex h-8 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium"
      >
        <Plus className="size-4" aria-hidden />
        {!collapsed && "Quick add"}
      </Link>
      <nav
        aria-label="Main"
        className="flex flex-1 flex-col gap-4 overflow-y-auto"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            {collapsed ? (
              <div className="bg-border mx-2 mb-1 h-px" aria-hidden />
            ) : (
              <p className="text-muted-foreground px-2 pb-1 text-xs font-medium">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="text-muted-foreground hover:bg-surface-hover hover:text-foreground flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors"
      >
        {collapsed ? (
          <PanelLeftOpen className="mx-auto size-4" aria-hidden />
        ) : (
          <>
            <PanelLeftClose className="size-4" aria-hidden />
            Collapse
          </>
        )}
      </button>
    </aside>
  );
}

function TopBar({
  pathname,
  switcher,
  email,
}: {
  pathname: string;
  switcher: ReactNode;
  email: string | null;
}) {
  const crumbs = breadcrumbs(pathname);

  return (
    <header className="border-border bg-background sticky top-0 z-20 flex h-12 items-center gap-3 border-b px-4">
      <div className="hidden md:block">{switcher}</div>
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
          {crumbs.map((crumb, index) => (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden>/</span>}
              {index === crumbs.length - 1 ? (
                <span
                  aria-current="page"
                  className="text-foreground font-medium"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search or run a command"
        className="border-border bg-surface text-muted-foreground hover:bg-surface-hover flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors max-md:size-11 max-md:justify-center max-md:px-0"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden md:inline">Search or jump to…</span>
        <kbd className="num border-border hidden rounded border px-1 text-xs md:inline">
          ⌘K
        </kbd>
      </button>
      <div className="hidden md:block">
        <ThemeToggle />
      </div>
      <span
        title={email ?? "Not signed in"}
        aria-label={email ? `Signed in as ${email}` : "Not signed in"}
        className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
      >
        {initialsOf(email)}
      </span>
    </header>
  );
}

function PhoneNav({
  pathname,
  onMenu,
}: {
  pathname: string;
  onMenu: () => void;
}) {
  const tabClass =
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium";

  return (
    <nav
      aria-label="Main"
      className="border-border bg-background fixed inset-x-0 bottom-0 z-20 flex border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {PHONE_TABS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            tabClass,
            isActive(pathname, item.href)
              ? "text-accent"
              : "text-muted-foreground",
          )}
        >
          <item.Icon className="size-5" aria-hidden />
          {item.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={onMenu}
        className={cn(tabClass, "text-muted-foreground")}
      >
        <Menu className="size-5" aria-hidden />
        Menu
      </button>
    </nav>
  );
}

function MenuSheet({
  pathname,
  switcher,
  onClose,
}: {
  pathname: string;
  switcher: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="bg-surface-raised border-border shadow-overlay absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          {switcher}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="hover:bg-surface-hover flex size-11 items-center justify-center rounded-md"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <Link
            href="/quick-add"
            onClick={onClose}
            className="bg-accent text-accent-foreground flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium"
          >
            <Plus className="size-4" aria-hidden />
            Quick add
          </Link>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col">
              <p className="text-muted-foreground px-2 pb-1 text-xs font-medium">
                {group.label}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium",
                    isActive(pathname, item.href) && "bg-accent-soft",
                  )}
                >
                  <item.Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-medium">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Shell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  // The sheet closes on navigation: it is only open for the path it opened on.
  const menuOpen = menuPath === pathname;
  const perBusinessOnly =
    pathname.startsWith("/deals") || pathname.startsWith("/revenue");
  const activeBusiness =
    searchParams.get("business") ?? (perBusinessOnly ? "statixx" : "all");

  useSearchShortcut();

  const switcher = (
    <BusinessSwitcher
      pathname={pathname}
      active={activeBusiness}
      perBusinessOnly={perBusinessOnly}
    />
  );

  return (
    <div data-business={activeBusiness} className="flex flex-1">
      <Sidebar pathname={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar pathname={pathname} switcher={switcher} email={userEmail} />
        <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>
      </div>
      <CommandPalette />
      <PhoneNav pathname={pathname} onMenu={() => setMenuPath(pathname)} />
      {menuOpen && (
        <MenuSheet
          pathname={pathname}
          switcher={switcher}
          onClose={() => setMenuPath(null)}
        />
      )}
    </div>
  );
}
