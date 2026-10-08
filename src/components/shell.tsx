"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type { Business } from "@/server/db/schema";

const BUSINESS_OPTIONS: { value: Business | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "statixx", label: "Statixx" },
  { value: "trazo", label: "Trazo" },
];

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/companies", label: "Companies" },
  { href: "/contacts", label: "Contacts" },
  { href: "/deals", label: "Deals" },
  { href: "/tasks", label: "Tasks" },
];

// Desktop sidebar only; the phone nav is already full.
const SIDEBAR_ONLY = [{ href: "/digest", label: "Morning digest" }];

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
      router.push("/companies?focus=1");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDeals = pathname.startsWith("/deals");
  const activeBusiness =
    searchParams.get("business") ?? (isDeals ? "statixx" : "all");
  const businessOptions = isDeals
    ? BUSINESS_OPTIONS.filter((option) => option.value !== "all")
    : BUSINESS_OPTIONS;

  useSearchShortcut();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden w-56 flex-col gap-6 border-r border-zinc-200 p-4 md:flex dark:border-zinc-800">
        <Link
          href="/quick-add"
          className="rounded bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Quick add
        </Link>
        <nav className="flex flex-col gap-1">
          {[...NAV_ITEMS, ...SIDEBAR_ONLY].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 text-sm font-medium ${
                item.href === "/"
                  ? pathname === "/"
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  : pathname.startsWith(item.href)
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div>
          <p className="px-3 text-xs font-medium text-zinc-500 uppercase">
            Business
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {businessOptions.map((option) => (
              <Link
                key={option.value}
                href={
                  isDeals
                    ? `/deals?business=${option.value}`
                    : option.value === "all"
                      ? "/companies"
                      : `/companies?business=${option.value}`
                }
                className={`rounded px-3 py-2 text-sm ${
                  (isDeals || pathname.startsWith("/companies")) &&
                  activeBusiness === option.value
                    ? "bg-zinc-100 font-medium dark:bg-zinc-800"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col pb-16 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-zinc-800 dark:bg-zinc-950">
        {[...NAV_ITEMS, { href: "/quick-add", label: "Quick add" }].map(
          (item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-500"
                }`}
              >
                {item.label}
              </Link>
            );
          },
        )}
      </nav>
    </div>
  );
}
