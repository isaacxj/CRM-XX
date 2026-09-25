"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { Business } from "@/server/db/schema";

const BUSINESS_OPTIONS: { value: Business | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "statixx", label: "Statixx" },
  { value: "trazo", label: "Trazo" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeBusiness = searchParams.get("business") ?? "all";

  return (
    <div className="flex flex-1">
      <aside className="flex w-56 flex-col gap-6 border-r border-zinc-200 p-4 dark:border-zinc-800">
        <nav className="flex flex-col gap-1">
          <Link
            href="/"
            className={`rounded px-3 py-2 text-sm font-medium ${
              pathname === "/"
                ? "bg-zinc-100 dark:bg-zinc-800"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            Home
          </Link>
          <Link
            href="/companies"
            className={`rounded px-3 py-2 text-sm font-medium ${
              pathname.startsWith("/companies")
                ? "bg-zinc-100 dark:bg-zinc-800"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            Companies
          </Link>
          <Link
            href="/contacts"
            className={`rounded px-3 py-2 text-sm font-medium ${
              pathname.startsWith("/contacts")
                ? "bg-zinc-100 dark:bg-zinc-800"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            Contacts
          </Link>
        </nav>
        <div>
          <p className="px-3 text-xs font-medium text-zinc-500 uppercase">
            Business
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {BUSINESS_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={
                  option.value === "all"
                    ? "/companies"
                    : `/companies?business=${option.value}`
                }
                className={`rounded px-3 py-2 text-sm ${
                  pathname.startsWith("/companies") &&
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
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
